import { describe, expect, it } from "vitest";
import { computePlayerRecommendations, type RecommendationEngineInput } from "./recommendationEngine";
import { computePlayerTags, type PlayerTag, type PlayerTagId } from "./playerTags";
import { defaultRosterConfig, defaultScoring, defaultModificatori } from "./league";
import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import type { ManagerAuctionStatus } from "./purchase";
import type { ProbableLineupEntry } from "./probableLineup";
import type { SetPieceTakerEntry } from "./setPieceTaker";

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

function lineup(
  playerName: string,
  team: string,
  stato: ProbableLineupEntry["stato"],
): ProbableLineupEntry {
  return { player_name: playerName, team, ruolo: null, stato };
}

function setPieceTakerEntry(
  playerName: string,
  team: string,
  tipo: SetPieceTakerEntry["tipo"],
  rank: number,
): SetPieceTakerEntry {
  return { team, tipo, player_name: playerName, rank };
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

const defaultRules: LeagueRulesConfig = {
  rosterConfig: defaultRosterConfig,
  scoring: defaultScoring,
  modificatori: defaultModificatori,
};

const defaultIoStatus = ioStatus([
  { ruolo: "P", free: 3 },
  { ruolo: "D", free: 8 },
  { ruolo: "C", free: 8 },
  { ruolo: "A", free: 6 },
]);

interface Scenario {
  players: Player[];
  stats?: PlayerSeasonStatsRow[];
  quotations?: QuotationRow[];
  probableLineup?: ProbableLineupEntry[];
  setPieceTaker?: SetPieceTakerEntry[];
  rules?: LeagueRulesConfig;
  ioStatus?: ManagerAuctionStatus;
}

// Compone recommendations (via computePlayerRecommendations, stessa
// lega/stagione) e poi calcola i tag su quello scenario — stesso spirito del
// layer server, che passa l'output del motore consigli a computePlayerTags
// invece di ricalcolarlo.
function tagsFor(scenario: Scenario): Map<number, PlayerTag[]> {
  const stats = scenario.stats ?? [];
  const quotations = scenario.quotations ?? [];
  const probableLineup = scenario.probableLineup ?? [];
  const rules = scenario.rules ?? defaultRules;

  const engineInput: RecommendationEngineInput = {
    rules,
    nSquadre: 8,
    players: scenario.players,
    quotations,
    stats,
    purchasedPlayerIds: new Set(),
    ioStatus: scenario.ioStatus ?? defaultIoStatus,
    probableLineup,
  };
  const recommendations = computePlayerRecommendations(engineInput);

  return computePlayerTags({
    players: scenario.players,
    stats,
    quotations,
    setPieceTaker: scenario.setPieceTaker ?? [],
    probableLineup,
    rules,
    recommendations,
  });
}

function idsOf(tags: { id: PlayerTagId }[] | undefined): PlayerTagId[] {
  return (tags ?? []).map((t) => t.id);
}

describe("computePlayerTags", () => {
  describe("rigorista", () => {
    it("tags a player ranked 1st or 2nd penalty taker for their team", () => {
      const p1 = player(1, "Rigorista Titolare", "A", "Team A");
      const result = tagsFor({
        players: [p1],
        stats: [stat(1)],
        setPieceTaker: [setPieceTakerEntry("Rigorista Titolare", "Team A", "rigore", 1)],
      });

      expect(idsOf(result.get(1))).toContain("rigorista");
    });

    it("does not tag a third-choice penalty taker", () => {
      const p1 = player(1, "Terza Scelta", "A", "Team A");
      const result = tagsFor({
        players: [p1],
        stats: [stat(1)],
        setPieceTaker: [setPieceTakerEntry("Terza Scelta", "Team A", "rigore", 3)],
      });

      expect(idsOf(result.get(1))).not.toContain("rigorista");
    });

    it("does not tag a top-ranked taker of a different set piece type", () => {
      const p1 = player(1, "Battitore Punizioni", "C", "Team A");
      const result = tagsFor({
        players: [p1],
        stats: [stat(1)],
        setPieceTaker: [setPieceTakerEntry("Battitore Punizioni", "Team A", "punizione", 1)],
      });

      expect(idsOf(result.get(1))).not.toContain("rigorista");
    });
  });

  describe("titolare da 6", () => {
    // 10 giocatori D con mv crescente: stessa distribuzione della tier usata
    // in recommendationEngine.test.ts. Indici 4 e 5 (id 5 e 6) cadono nella
    // fascia "Utile" (percentile .444 e .556, tra le soglie .35 e .65).
    const players = Array.from({ length: 10 }, (_, i) => player(i + 1, `P${i + 1}`, "D"));
    const stats = players.map((p, i) => stat(p.id, { mv: 5 + i * 0.3, presenze: 30 }));

    it("tags a titolare in the middle tier with high reliability", () => {
      const result = tagsFor({
        players,
        stats,
        probableLineup: [lineup("P6", "Team", "titolare")],
      });

      expect(idsOf(result.get(6))).toContain("titolare-da-6");
    });

    it("does not tag a middle-tier player without a titolare lineup match", () => {
      const result = tagsFor({ players, stats });

      expect(idsOf(result.get(5))).not.toContain("titolare-da-6");
    });

    it("does not tag a top-tier titolare (too much upside for 'da 6')", () => {
      const result = tagsFor({
        players,
        stats,
        probableLineup: [lineup("P10", "Team", "titolare")],
      });

      expect(idsOf(result.get(10))).not.toContain("titolare-da-6");
    });
  });

  describe("porta bonus", () => {
    it("tags only the top (gol+assist)/presenza rate in the role", () => {
      const p1 = player(1, "Nessun Bonus", "A");
      const p2 = player(2, "Bonus Modesti", "A");
      const p3 = player(3, "Buoni Bonus", "A");
      const p4 = player(4, "Bomber", "A");
      const stats = [
        stat(1, { gf: 0, assist: 0, presenze: 10, mv: 6 }),
        stat(2, { gf: 2, assist: 0, presenze: 10, mv: 6 }),
        stat(3, { gf: 4, assist: 0, presenze: 10, mv: 6 }),
        stat(4, { gf: 10, assist: 0, presenze: 10, mv: 6 }),
      ];

      const result = tagsFor({ players: [p1, p2, p3, p4], stats });

      expect(idsOf(result.get(4))).toContain("porta-bonus");
      expect(idsOf(result.get(3))).not.toContain("porta-bonus");
      expect(idsOf(result.get(1))).not.toContain("porta-bonus");
    });

    it("does not tag players with no presenze (rate would be invented)", () => {
      const p1 = player(1, "Senza Presenze", "A");
      const result = tagsFor({ players: [p1], stats: [stat(1, { presenze: 0, mv: 6 })] });

      expect(idsOf(result.get(1))).not.toContain("porta-bonus");
    });
  });

  describe("difensore da bonus", () => {
    const gkSolid = player(1, "Portiere Solido", "P", "Squadra Solida");
    const gkWeak = player(2, "Portiere Fragile", "P", "Squadra Debole");
    const defSolidTeam = player(3, "Difensore Squadra Solida", "D", "Squadra Solida");
    const defWeakTeam = player(4, "Difensore Squadra Debole", "D", "Squadra Debole");
    const decoyBonusDefender = player(5, "Difensore Da Bonus Proprio", "D", "Squadra Decoy");

    const stats = [
      stat(1, { gs: 20, presenze: 30, mv: 6 }),
      stat(2, { gs: 90, presenze: 30, mv: 6 }),
      stat(3, { gf: 0, assist: 0, presenze: 30, mv: 6 }),
      stat(4, { gf: 0, assist: 0, presenze: 30, mv: 6 }),
      stat(5, { gf: 5, assist: 0, presenze: 10, mv: 6 }),
    ];
    const players = [gkSolid, gkWeak, defSolidTeam, defWeakTeam, decoyBonusDefender];

    it("tags a defender on a team with a solid defensive record even without own bonus stats", () => {
      const result = tagsFor({ players, stats });

      expect(idsOf(result.get(3))).toContain("difensore-da-bonus");
      expect(idsOf(result.get(4))).not.toContain("difensore-da-bonus");
    });

    it("tags a defender with a top own bonus rate regardless of team defense", () => {
      const result = tagsFor({ players, stats });

      expect(idsOf(result.get(5))).toContain("difensore-da-bonus");
    });

    it("does not tag a goalkeeper even on a team with a solid defensive record", () => {
      const result = tagsFor({ players, stats });

      expect(idsOf(result.get(1))).not.toContain("difensore-da-bonus");
    });

    it("does not use team defense as a signal when the difesa modifier is disabled", () => {
      const rules: LeagueRulesConfig = {
        ...defaultRules,
        modificatori: { ...defaultModificatori, difesa: { ...defaultModificatori.difesa, enabled: false } },
      };
      const result = tagsFor({ players, stats, rules });

      expect(idsOf(result.get(3))).not.toContain("difensore-da-bonus");
    });
  });

  describe("scommessa", () => {
    it("tags a cheap player with a high mv on a small sample", () => {
      const cheap = player(1, "Sorpresa", "C", "Team A");
      const mid = player(2, "Prezzo Medio", "C", "Team B");
      const expensive = player(3, "Big", "C", "Team C");
      const stats = [
        stat(1, { mv: 6.5, presenze: 5 }),
        stat(2, { mv: 6, presenze: 30 }),
        stat(3, { mv: 7, presenze: 30 }),
      ];
      const quotations = [quotation(1, { fvm: 1 }), quotation(2, { fvm: 20 }), quotation(3, { fvm: 100 })];

      const result = tagsFor({ players: [cheap, mid, expensive], stats, quotations });

      expect(idsOf(result.get(1))).toContain("scommessa");
    });

    it("tags a cheap today's starter with little historical data", () => {
      const rookie = player(1, "Neopromosso", "A", "Team A");
      const mid = player(2, "Prezzo Medio", "A", "Team B");
      const expensive = player(3, "Big", "A", "Team C");
      const stats = [
        stat(1, { mv: 6, presenze: 3 }),
        stat(2, { mv: 6, presenze: 30 }),
        stat(3, { mv: 7, presenze: 30 }),
      ];
      const quotations = [quotation(1, { fvm: 1 }), quotation(2, { fvm: 20 }), quotation(3, { fvm: 100 })];

      const result = tagsFor({
        players: [rookie, mid, expensive],
        stats,
        quotations,
        probableLineup: [lineup("Neopromosso", "Team A", "titolare")],
      });

      expect(idsOf(result.get(1))).toContain("scommessa");
    });

    it("does not tag a cheap player with a large, unremarkable sample", () => {
      const cheap = player(1, "Economico Ma Normale", "C", "Team A");
      const mid = player(2, "Prezzo Medio", "C", "Team B");
      const expensive = player(3, "Big", "C", "Team C");
      const stats = [
        stat(1, { mv: 6, presenze: 30 }),
        stat(2, { mv: 6, presenze: 30 }),
        stat(3, { mv: 7, presenze: 30 }),
      ];
      const quotations = [quotation(1, { fvm: 1 }), quotation(2, { fvm: 20 }), quotation(3, { fvm: 100 })];

      const result = tagsFor({ players: [cheap, mid, expensive], stats, quotations });

      expect(idsOf(result.get(1))).not.toContain("scommessa");
    });

    it("tags a cheap starter with no stat row at all (missing sample)", () => {
      const ghost = player(1, "Senza Storico", "C", "Team A");
      const mid = player(2, "Prezzo Medio", "C", "Team B");
      const expensive = player(3, "Big", "C", "Team C");
      // ghost ha una riga con campi bonus null (esercita i `?? 0`); nessuna
      // riga per un quarto giocatore esercita il ramo `!stat`.
      const ghostless = player(4, "Nessuna Riga", "C", "Team D");
      const stats = [
        stat(1, { presenze: 2, gf: null, assist: null, mv: 6 }),
        stat(2, { mv: 6, presenze: 30 }),
        stat(3, { mv: 7, presenze: 30 }),
      ];
      const quotations = [
        quotation(1, { fvm: 1 }),
        quotation(2, { fvm: 20 }),
        quotation(3, { fvm: 100 }),
        quotation(4, { fvm: 2 }),
      ];

      const result = tagsFor({
        players: [ghost, mid, expensive, ghostless],
        stats,
        quotations,
        probableLineup: [lineup("Senza Storico", "Team A", "titolare")],
      });

      expect(idsOf(result.get(1))).toContain("scommessa");
      expect(idsOf(result.get(4))).not.toContain("porta-bonus");
    });
  });

  describe("da prendere a 1", () => {
    it("tags the replacement-level player at minimum FVM when Io still needs the role", () => {
      const best = player(1, "Migliore", "C");
      const replacement = player(2, "Rimpiazzo", "C");
      const third = player(3, "Terzo", "C");
      const stats = [
        stat(1, { mv: 8, presenze: 30 }),
        stat(2, { mv: 6.5, presenze: 30 }),
        stat(3, { mv: 5, presenze: 30 }),
      ];
      const quotations = [quotation(2, { fvm: 1 })];

      const result = tagsFor({
        players: [best, replacement, third],
        stats,
        quotations,
        ioStatus: ioStatus([{ ruolo: "C", free: 1 }]),
      });

      expect(idsOf(result.get(2))).toContain("da-prendere-a-1");
    });

    it("does not tag it when Io no longer needs the role", () => {
      const best = player(1, "Migliore", "C");
      const replacement = player(2, "Rimpiazzo", "C");
      const stats = [stat(1, { mv: 8, presenze: 30 }), stat(2, { mv: 6.5, presenze: 30 })];
      const quotations = [quotation(1, { fvm: 1 })];

      const result = tagsFor({
        players: [best, replacement],
        stats,
        quotations,
        ioStatus: ioStatus([{ ruolo: "C", free: 0 }]),
      });

      expect(idsOf(result.get(1))).not.toContain("da-prendere-a-1");
    });

    it("does not tag a replacement-level player above the minimum FVM", () => {
      const best = player(1, "Migliore", "C");
      const replacement = player(2, "Rimpiazzo", "C");
      const third = player(3, "Terzo", "C");
      const stats = [
        stat(1, { mv: 8, presenze: 30 }),
        stat(2, { mv: 6.5, presenze: 30 }),
        stat(3, { mv: 5, presenze: 30 }),
      ];
      const quotations = [quotation(2, { fvm: 5 })];

      const result = tagsFor({
        players: [best, replacement, third],
        stats,
        quotations,
        ioStatus: ioStatus([{ ruolo: "C", free: 1 }]),
      });

      expect(idsOf(result.get(2))).not.toContain("da-prendere-a-1");
    });
  });
});
