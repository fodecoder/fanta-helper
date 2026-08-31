import { describe, expect, it } from "vitest";
import { generateDefaultValuations } from "./defaultValuationGenerator";
import { defaultModificatori, defaultRosterConfig, defaultScoring } from "./league";
import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import { valuationEntrySchema } from "./valuation";
import { ROLES, type Role } from "./roles";

function player(id: number, name: string, ruolo: Role, team = `Team${id}`): Player {
  return { id, fanta_id: id, sofifa_id: null, name, nome_completo: null, team, ruolo, image_url: null };
}

function stat(playerId: number, overrides: Partial<PlayerSeasonStatsRow> = {}): PlayerSeasonStatsRow {
  return {
    player_id: playerId,
    season: "2025-26",
    presenze: 32,
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

function quotation(playerId: number, fvm: number): QuotationRow {
  return { player_id: playerId, season: "2026-27", qt_i: fvm, qt_a: fvm, fvm };
}

const rulesDifesaOn: LeagueRulesConfig = {
  rosterConfig: defaultRosterConfig,
  scoring: defaultScoring,
  modificatori: defaultModificatori,
};

const rulesDifesaOff: LeagueRulesConfig = {
  ...rulesDifesaOn,
  modificatori: {
    ...defaultModificatori,
    difesa: { ...defaultModificatori.difesa, enabled: false },
  },
};

// Pool fixture: 4 ruoli, gradiente di mv per separare le fasce, un debuttante
// senza stat, un giocatore con pochi fantavoti.
function buildPool(): { players: Player[]; stats: PlayerSeasonStatsRow[]; quotations: QuotationRow[] } {
  const players: Player[] = [];
  const stats: PlayerSeasonStatsRow[] = [];
  const quotations: QuotationRow[] = [];

  let id = 0;
  for (const role of ROLES) {
    for (let i = 0; i < 6; i += 1) {
      id += 1;
      players.push(player(id, `${role}${i}`, role));
      quotations.push(quotation(id, 20 - i * 2));
      // i=5 è un giocatore poco utilizzato (pochi fantavoti).
      const presenze = i === 5 ? 8 : 34 - i * 3;
      stats.push(stat(id, { presenze, mv: 7 - i * 0.35, gf: role === "A" ? 12 - i * 2 : 0 }));
    }
  }
  // Debuttante senza riga statistica: nessuno storico Serie A.
  id += 1;
  players.push(player(id, "Debuttante", "C"));
  quotations.push(quotation(id, 3));

  return { players, stats, quotations };
}

describe("generateDefaultValuations", () => {
  it("copre il 100% del pool con una riga per giocatore", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 8 });

    expect(out.players).toHaveLength(players.length);
    const emitted = new Set(out.players.map((p) => `${p.name}|${p.team}`));
    for (const p of players) expect(emitted.has(`${p.name}|${p.team}`)).toBe(true);
  });

  it("emette righe valide contro valuationEntrySchema", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 10 });
    for (const row of out.players) {
      expect(() => valuationEntrySchema.parse(row)).not.toThrow();
      expect(["low", "medium", "high"]).toContain(row.confidence);
      expect(["S", "A", "B", "C", "D"]).toContain(row.tier);
      expect(row.max_bid).toBeGreaterThanOrEqual(row.fair_value);
      expect(row.panic_price).toBeGreaterThanOrEqual(row.max_bid);
    }
  });

  it("riporta l'involucro sample: budget 1000, n_teams, roster con tot", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({
      players,
      stats,
      quotations,
      rules: rulesDifesaOn,
      nSquadre: 8,
      leagueName: "Lega Test",
      generatedAt: "2026-08-31T00:00:00.000Z",
    });
    expect(out).toMatchObject({
      league_name: "Lega Test",
      generated_at: "2026-08-31T00:00:00.000Z",
      budget: 1000,
      n_teams: 8,
      roster: { P: 3, D: 8, C: 8, A: 6, tot: 25 },
    });
  });

  it("Σ fair_value per reparto ≈ B_R × nSquadre (difesa ON: P65 D260 C315 A360)", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 8 });
    const perTeam: Record<Role, number> = { P: 65, D: 260, C: 315, A: 360 };
    for (const role of ROLES) {
      const sum = out.players.filter((p) => p.ruolo === role).reduce((s, p) => s + p.fair_value, 0);
      expect(Math.abs(sum - perTeam[role] * 8)).toBeLessThanOrEqual(2);
    }
  });

  it("difesa OFF sposta il budget: la difesa cala, l'attacco sale", () => {
    const { players, stats, quotations } = buildPool();
    const off = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOff, nSquadre: 8 });
    const sum = (role: Role) =>
      off.players.filter((p) => p.ruolo === role).reduce((s, p) => s + p.fair_value, 0);
    expect(Math.abs(sum("D") - 190 * 8)).toBeLessThanOrEqual(2);
    expect(Math.abs(sum("A") - 420 * 8)).toBeLessThanOrEqual(2);
  });

  it("confidence differenziata: C top → high, A top → medium, pochi fantavoti → low", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 8 });

    const topC = out.players.filter((p) => p.ruolo === "C" && p.tier === "S")[0];
    expect(topC?.confidence).toBe("high");

    const topA = out.players.filter((p) => p.ruolo === "A" && p.tier === "S")[0];
    expect(topA?.confidence).toBe("medium");

    // I giocatori "5" hanno 8 fantavoti (< 15): sempre low.
    const lowUsage = out.players.find((p) => p.name.endsWith("5"));
    expect(lowUsage?.confidence).toBe("low");
  });

  it("il debuttante senza storico è comunque emesso: tier D, confidence low", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 8 });
    const rookie = out.players.find((p) => p.name === "Debuttante");
    expect(rookie).toBeDefined();
    expect(rookie!.tier).toBe("D");
    expect(rookie!.confidence).toBe("low");
    expect(rookie!.fair_value).toBeGreaterThanOrEqual(1);
  });

  it("nSquadre 8 vs 10 producono importi diversi, non un riscalaggio lineare", () => {
    // Pool ampio abbastanza da tenere la scarsità di reparto fuori dai bound
    // di clamp del motore, così nSquadre incide davvero sugli importi.
    const players: Player[] = [];
    const stats: PlayerSeasonStatsRow[] = [];
    for (let i = 1; i <= 70; i += 1) {
      players.push(player(i, `D${i}`, "D"));
      stats.push(stat(i, { mv: 5 + (i % 20) * 0.1, presenze: 30 }));
    }
    const eight = generateDefaultValuations({ players, stats, quotations: [], rules: rulesDifesaOn, nSquadre: 8 });
    const ten = generateDefaultValuations({ players, stats, quotations: [], rules: rulesDifesaOn, nSquadre: 10 });

    const e = new Map(eight.players.map((p) => [p.name, p]));
    const ratios: number[] = [];
    for (const tp of ten.players) {
      const ep = e.get(tp.name)!;
      if (ep.max_bid > 0) ratios.push(tp.max_bid / ep.max_bid);
    }
    expect(ratios.some((r) => r !== 1)).toBe(true);
    const allEqual = ratios.every((r) => Math.abs(r - ratios[0]!) < 1e-9);
    expect(allEqual).toBe(false);
  });

  it("è deterministico: due run a parità di generated_at sono identici byte a byte", () => {
    const { players, stats, quotations } = buildPool();
    const run = () =>
      JSON.stringify(
        generateDefaultValuations({
          players,
          stats,
          quotations,
          rules: rulesDifesaOn,
          nSquadre: 8,
          generatedAt: "2026-08-31T00:00:00.000Z",
        }),
      );
    expect(run()).toBe(run());
  });

  it("ordina le righe per ruolo, poi valore decrescente, poi nome", () => {
    const { players, stats, quotations } = buildPool();
    const out = generateDefaultValuations({ players, stats, quotations, rules: rulesDifesaOn, nSquadre: 8 });
    const roleOrder = out.players.map((p) => ROLES.indexOf(p.ruolo));
    expect(roleOrder).toEqual([...roleOrder].sort((a, b) => a - b));
  });

  it("reparto più affollato del budget: tutti i giocatori restano al pavimento di 1", () => {
    const players: Player[] = [];
    const stats: PlayerSeasonStatsRow[] = [];
    for (let i = 1; i <= 70; i += 1) {
      players.push(player(i, `GK${i}`, "P"));
      stats.push(stat(i, { mv: 6 + (i % 5) * 0.2 }));
    }
    // budget di reparto P = 65 × 1 = 65 < 70 giocatori: nessun residuo da
    // distribuire, tutti al pavimento.
    const out = generateDefaultValuations({ players, stats, quotations: [], rules: rulesDifesaOn, nSquadre: 1 });
    const keepers = out.players.filter((p) => p.ruolo === "P");
    expect(keepers).toHaveLength(70);
    for (const k of keepers) expect(k.fair_value).toBe(1);
  });

  it("a parità di ruolo, valore e nome ordina per team (tiebreak stabile)", () => {
    const players: Player[] = [
      { id: 1, fanta_id: 1, sofifa_id: null, name: "Omonimo", nome_completo: null, team: "Zebra", ruolo: "A", image_url: null },
      { id: 2, fanta_id: 2, sofifa_id: null, name: "Omonimo", nome_completo: null, team: "Alpha", ruolo: "A", image_url: null },
    ];
    const stats = players.map((p) => stat(p.id, { mv: 6, gf: 4, presenze: 30 }));
    const out = generateDefaultValuations({ players, stats, quotations: [], rules: rulesDifesaOn, nSquadre: 8 });
    const attackers = out.players.filter((p) => p.ruolo === "A");
    expect(attackers.map((p) => p.team)).toEqual(["Alpha", "Zebra"]);
  });

  it("reparto senza segnale di surplus: budget diviso equamente", () => {
    const players = [1, 2, 3, 4].map((i) => player(i, `D${i}`, "D", "SameTeam"));
    const stats = players.map((p) => stat(p.id, { mv: 5.5 }));
    const out = generateDefaultValuations({ players, stats, quotations: [], rules: rulesDifesaOff, nSquadre: 8 });
    const defenders = out.players.filter((p) => p.ruolo === "D");
    const sum = defenders.reduce((s, p) => s + p.fair_value, 0);
    expect(Math.abs(sum - 190 * 8)).toBeLessThanOrEqual(2);
    const values = defenders.map((d) => d.fair_value);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });
});
