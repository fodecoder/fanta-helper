import { describe, expect, it } from "vitest";
import { computePlayerRecommendations, type RecommendationEngineInput } from "./recommendationEngine";
import { defaultRosterConfig, defaultScoring, defaultModificatori } from "./league";
import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import type { ManagerAuctionStatus } from "./purchase";

function player(id: number, name: string, ruolo: Player["ruolo"], team = "Team"): Player {
  return { id, fanta_id: id, sofifa_id: null, name, team, ruolo, image_url: null };
}

function stat(playerId: number, overrides: Partial<PlayerSeasonStatsRow> = {}): PlayerSeasonStatsRow {
  return {
    player_id: playerId,
    season: "2025-26",
    presenze: 30,
    mv: 6,
    fm: 6,
    gf: 0,
    gs: 0,
    assist: 0,
    rp: 0,
    rc: 0,
    rig_plus: 0,
    rig_minus: 0,
    amm: 0,
    esp: 0,
    autogol: 0,
    ...overrides,
  };
}

function quotation(playerId: number, overrides: Partial<QuotationRow> = {}): QuotationRow {
  return { player_id: playerId, season: "2026-27", qt_i: 10, qt_a: 10, fvm: 10, ...overrides };
}

function ioStatus(slots: { ruolo: Player["ruolo"]; free: number }[]): ManagerAuctionStatus {
  return {
    managerId: 1,
    managerName: "Io",
    isOwner: true,
    budget: 1000,
    spent: 0,
    residuo: 1000,
    adjustedMaxBid: 1000,
    slots: slots.map((s) => ({ ruolo: s.ruolo, total: s.free, used: 0, free: s.free })),
  };
}

const rules: LeagueRulesConfig = {
  rosterConfig: defaultRosterConfig,
  scoring: defaultScoring,
  modificatori: defaultModificatori,
};

function baseInput(overrides: Partial<RecommendationEngineInput> = {}): RecommendationEngineInput {
  return {
    rules,
    nSquadre: 8,
    players: [],
    quotations: [],
    stats: [],
    purchasedPlayerIds: new Set(),
    ioStatus: ioStatus([
      { ruolo: "P", free: 3 },
      { ruolo: "D", free: 8 },
      { ruolo: "C", free: 8 },
      { ruolo: "A", free: 6 },
    ]),
    ...overrides,
  };
}

describe("computePlayerRecommendations", () => {
  it("flags players with no stats row for the latest season instead of inventing data", () => {
    const p1 = player(1, "Senza dati", "A");
    const result = computePlayerRecommendations(baseInput({ players: [p1], stats: [] }));

    expect(result).toHaveLength(1);
    expect(result[0]!.components.dataMissing).toBe(true);
    expect(result[0]!.components.reliability).toBe(0);
    expect(result[0]!.components.leagueAdjustedFm).toBeNull();
  });

  it("excludes already-purchased players from the output", () => {
    const p1 = player(1, "Comprato", "A");
    const p2 = player(2, "Libero", "A");
    const result = computePlayerRecommendations(
      baseInput({
        players: [p1, p2],
        stats: [stat(1), stat(2)],
        purchasedPlayerIds: new Set([1]),
      }),
    );

    expect(result.map((r) => r.player_id)).toEqual([2]);
  });

  it("reconstructs the league-adjusted fantamedia from raw bonus counts weighted by league scoring, not the imported fm", () => {
    const p1 = player(1, "Bomber", "A");
    const p2 = player(2, "Assist man", "A");
    // Same imported fm, different raw components: with default scoring
    // (gol=3, assist=1) the goal-scorer must come out ahead once the engine
    // recomputes from gf/assist instead of trusting the imported fm.
    const s1 = stat(1, { fm: 6, gf: 10, assist: 0, presenze: 30 });
    const s2 = stat(2, { fm: 6, gf: 0, assist: 10, presenze: 30 });

    const result = computePlayerRecommendations(
      baseInput({ players: [p1, p2], stats: [s1, s2] }),
    );

    const bomber = result.find((r) => r.player_id === 1)!;
    const assistMan = result.find((r) => r.player_id === 2)!;
    expect(bomber.components.leagueAdjustedFm).toBeGreaterThan(assistMan.components.leagueAdjustedFm!);
  });

  it("applies the difesa modifier bonus from the league table only to P/D roles when enabled", () => {
    const customRules: LeagueRulesConfig = {
      ...rules,
      modificatori: {
        ...defaultModificatori,
        difesa: {
          enabled: true,
          tabella: [
            { media: 6, bonus: 1 },
            { media: 7, bonus: 6 },
          ],
        },
      },
    };
    const defender = player(1, "Difensore", "D");
    const attacker = player(2, "Attaccante", "A");
    const stats = [stat(1, { mv: 7, gf: 0 }), stat(2, { mv: 7, gf: 0 })];

    const result = computePlayerRecommendations(
      baseInput({ rules: customRules, players: [defender, attacker], stats }),
    );

    const defenderRow = result.find((r) => r.player_id === 1)!;
    const attackerRow = result.find((r) => r.player_id === 2)!;
    expect(defenderRow.components.leagueAdjustedFm).toBe(7 + 6);
    expect(attackerRow.components.leagueAdjustedFm).toBe(7);
  });

  it("does not apply the difesa bonus when the modifier is disabled", () => {
    const customRules: LeagueRulesConfig = {
      ...rules,
      modificatori: {
        ...defaultModificatori,
        difesa: { enabled: false, tabella: [{ media: 6, bonus: 5 }] },
      },
    };
    const defender = player(1, "Difensore", "D");
    const result = computePlayerRecommendations(
      baseInput({ rules: customRules, players: [defender], stats: [stat(1, { mv: 7 })] }),
    );

    expect(result[0]!.components.leagueAdjustedFm).toBe(7);
  });

  it("applies an expected clean-sheet bonus to a goalkeeper's fm when the portiere modifier is enabled", () => {
    const customRules: LeagueRulesConfig = {
      ...rules,
      modificatori: {
        ...defaultModificatori,
        difesa: { ...defaultModificatori.difesa, enabled: false },
        portiere: { enabled: true },
      },
    };
    const solidGk = player(1, "Portiere Solido", "P", "Team A");
    const weakGk = player(2, "Portiere Fragile", "P", "Team B");
    const stats = [
      stat(1, { mv: 6, gs: 5, presenze: 30 }),
      stat(2, { mv: 6, gs: 45, presenze: 30 }),
    ];

    const result = computePlayerRecommendations(
      baseInput({ rules: customRules, players: [solidGk, weakGk], stats }),
    );

    const solidRow = result.find((r) => r.player_id === 1)!;
    const weakRow = result.find((r) => r.player_id === 2)!;
    expect(solidRow.components.leagueAdjustedFm).toBeGreaterThan(weakRow.components.leagueAdjustedFm!);
  });

  it("does not apply the portiere bonus when the modifier is disabled", () => {
    const customRules: LeagueRulesConfig = {
      ...rules,
      modificatori: {
        ...defaultModificatori,
        difesa: { ...defaultModificatori.difesa, enabled: false },
        portiere: { enabled: false },
      },
    };
    const gk = player(1, "Portiere", "P", "Team A");
    const s = stat(1, { mv: 6, gs: 5, presenze: 30 });

    const result = computePlayerRecommendations(
      baseInput({ rules: customRules, players: [gk], stats: [s] }),
    );

    // 6 (mv) + (5 gs / 30 presenze) * -1 (scoring.gol_subito) = 5.8333...
    expect(result[0]!.components.leagueAdjustedFm).toBeCloseTo(6 - 5 / 30, 5);
  });

  it("blends the mv with the player's team defense record for the difesa bonus band lookup", () => {
    const solidGk = player(1, "Portiere Solido", "P", "Squadra Solida");
    const weakGk = player(2, "Portiere Fragile", "P", "Squadra Fragile");
    const solidDefender = player(3, "Difensore Solido", "D", "Squadra Solida");
    const weakDefender = player(4, "Difensore Fragile", "D", "Squadra Fragile");
    const stats = [
      stat(1, { mv: 6, gs: 6, presenze: 30 }),
      stat(2, { mv: 6, gs: 45, presenze: 30 }),
      stat(3, { mv: 6.5, gs: 0, presenze: 30 }),
      stat(4, { mv: 6.5, gs: 0, presenze: 30 }),
    ];

    const result = computePlayerRecommendations(
      baseInput({ players: [solidGk, weakGk, solidDefender, weakDefender], stats }),
    );

    const solidRow = result.find((r) => r.player_id === 3)!;
    const weakRow = result.find((r) => r.player_id === 4)!;
    expect(solidRow.components.leagueAdjustedFm).toBeGreaterThan(weakRow.components.leagueAdjustedFm!);
  });

  it("falls back to the plain mv for the difesa bonus when no team defense data is available", () => {
    const defender = player(1, "Difensore", "D");
    const result = computePlayerRecommendations(
      baseInput({ rules, players: [defender], stats: [stat(1, { mv: 7 })] }),
    );

    // No P-role player/stat in the input, so no team defense rate exists for
    // "Team": difesaBonus falls back to the raw mv, same as pre-blend
    // behavior (default difesa tabella: media 7 -> bonus 6).
    expect(result[0]!.components.leagueAdjustedFm).toBe(7 + 6);
  });

  it("weights reliability by presence share of the season's elapsed matchdays, not a fixed 38", () => {
    const full = player(1, "Sempre in campo", "C");
    const half = player(2, "Metà stagione", "C");
    // Max presenze observed this season is 20 (not 38): "half" played 10/20.
    const stats = [stat(1, { presenze: 20, mv: 6 }), stat(2, { presenze: 10, mv: 6 })];

    const result = computePlayerRecommendations(baseInput({ players: [full, half], stats }));

    const fullRow = result.find((r) => r.player_id === 1)!;
    const halfRow = result.find((r) => r.player_id === 2)!;
    expect(fullRow.components.reliability).toBe(1);
    expect(halfRow.components.reliability).toBe(0.5);
  });

  it("clamps the scarcity multiplier within its stability bounds", () => {
    // Extreme scarcity: 8 teams * 6 attacker slots = 48 demand vs 1 supply.
    const p1 = player(1, "Unico disponibile", "A");
    const result = computePlayerRecommendations(
      baseInput({ players: [p1], stats: [stat(1)], nSquadre: 8 }),
    );

    expect(result[0]!.components.scarcityMultiplier).toBeLessThanOrEqual(1.35);
    expect(result[0]!.components.scarcityMultiplier).toBeGreaterThanOrEqual(0.85);
  });

  it("scores VORP as the margin above the replacement player at Io's free-slot rank", () => {
    // Io has 1 free slot at C: the replacement is the 2nd-best available C.
    const p1 = player(1, "Migliore", "C");
    const p2 = player(2, "Rimpiazzo", "C");
    const p3 = player(3, "Terzo", "C");
    const stats = [
      stat(1, { mv: 8, presenze: 30 }),
      stat(2, { mv: 6.5, presenze: 30 }),
      stat(3, { mv: 5, presenze: 30 }),
    ];
    const status = ioStatus([{ ruolo: "C", free: 1 }]);

    const result = computePlayerRecommendations(
      baseInput({ players: [p1, p2, p3], stats, ioStatus: status }),
    );

    const best = result.find((r) => r.player_id === 1)!;
    const replacement = result.find((r) => r.player_id === 2)!;
    expect(best.components.replacementValue).toBeCloseTo(replacement.score + replacement.components.replacementValue);
    expect(best.score).toBeCloseTo(best.components.rawValue * best.components.scarcityMultiplier - best.components.replacementValue);
    expect(replacement.score).toBeCloseTo(0);
  });

  it("assigns the top percentile tier to the best-scoring player in a role and the lowest to the worst", () => {
    const players = Array.from({ length: 10 }, (_, i) => player(i + 1, `P${i + 1}`, "D"));
    const stats = players.map((p, i) => stat(p.id, { mv: 5 + i * 0.3, presenze: 30 }));

    const result = computePlayerRecommendations(baseInput({ players, stats }));
    const best = result.find((r) => r.player_id === 10)!;
    const worst = result.find((r) => r.player_id === 1)!;

    expect(best.tier).toBe("Top");
    expect(worst.tier).toBe("Scommessa");
  });

  it("signals a positive price gap when the engine value ranks higher than the market price", () => {
    const bargain = player(1, "Occasione", "A");
    const overpriced = player(2, "Sopravvalutato", "A");
    const stats = [stat(1, { mv: 8, presenze: 30 }), stat(2, { mv: 5, presenze: 30 })];
    const quotations = [quotation(1, { fvm: 5 }), quotation(2, { fvm: 50 })];

    const result = computePlayerRecommendations(
      baseInput({ players: [bargain, overpriced], stats, quotations }),
    );

    const bargainRow = result.find((r) => r.player_id === 1)!;
    expect(bargainRow.price.gapSignal).not.toBeNull();
    expect(bargainRow.price.gapSignal!).toBeGreaterThan(0);
  });

  it("sorts the output by score descending", () => {
    const players = Array.from({ length: 5 }, (_, i) => player(i + 1, `P${i + 1}`, "D"));
    const stats = players.map((p, i) => stat(p.id, { mv: 5 + i, presenze: 30 }));

    const result = computePlayerRecommendations(baseInput({ players, stats }));

    const scores = result.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
