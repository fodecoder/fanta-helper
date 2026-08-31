import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
  generateDefaultValuations,
  type LeagueRulesConfig,
  type Player,
  type PlayerSeasonStatsRow,
  type QuotationRow,
  type Role,
} from "@fanta-helper/shared";
import { ROLES } from "@fanta-helper/shared";

const { findPlayersByNameTeam, upsertValuation } = vi.hoisted(() => ({
  findPlayersByNameTeam: vi.fn(),
  upsertValuation: vi.fn(),
}));

vi.mock("../db/players", () => ({ findPlayersByNameTeam }));
vi.mock("../db/valuations", () => ({ upsertValuation }));

import { importValuationEntries } from "./valuationJson";

const rules: LeagueRulesConfig = {
  rosterConfig: defaultRosterConfig,
  scoring: defaultScoring,
  modificatori: defaultModificatori,
};

function player(id: number, name: string, ruolo: Role): Player {
  return {
    id,
    fanta_id: id,
    sofifa_id: null,
    name,
    nome_completo: null,
    team: `Team${id}`,
    ruolo,
    image_url: null,
  };
}

function stat(playerId: number, mv: number, presenze = 30): PlayerSeasonStatsRow {
  return {
    player_id: playerId,
    season: "2025-26",
    presenze,
    mv,
    fm: mv,
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
  };
}

function buildPool() {
  const players: Player[] = [];
  const stats: PlayerSeasonStatsRow[] = [];
  const quotations: QuotationRow[] = [];
  let id = 0;
  for (const role of ROLES) {
    for (let i = 0; i < 5; i += 1) {
      id += 1;
      players.push(player(id, `${role}-${i}`, role));
      stats.push(stat(id, 6.5 - i * 0.3));
      quotations.push({ player_id: id, season: "2026-27", qt_i: 10, qt_a: 10, fvm: 15 - i });
    }
  }
  // Un debuttante senza statistiche: deve comunque ricevere una riga e
  // risolversi nel seed.
  id += 1;
  players.push(player(id, "Debuttante", "A"));
  quotations.push({ player_id: id, season: "2026-27", qt_i: 1, qt_a: 1, fvm: 2 });
  return { players, stats, quotations };
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertValuation.mockResolvedValue({ inserted: true });
});

describe("generateDefaultValuations → importValuationEntries", () => {
  for (const nSquadre of [8, 10]) {
    it(`semina ogni giocatore del pool senza scarti né unmatched (nSquadre ${nSquadre})`, async () => {
      const { players, stats, quotations } = buildPool();
      const byNameTeam = new Map(players.map((p) => [`${p.name.toLowerCase()}|${p.team.toLowerCase()}`, p]));
      findPlayersByNameTeam.mockImplementation(async (name: string, team: string) => {
        const hit = byNameTeam.get(`${name.toLowerCase()}|${team.toLowerCase()}`);
        return hit ? [{ id: hit.id }] : [];
      });

      const envelope = generateDefaultValuations({
        players,
        quotations,
        stats,
        rules,
        nSquadre,
        generatedAt: "2026-08-31T00:00:00.000Z",
      });

      const report = await importValuationEntries(1, envelope.players);

      expect(report.discarded).toEqual([]);
      expect(report.unmatched).toEqual([]);
      expect(report.imported).toBe(players.length);
      expect(upsertValuation).toHaveBeenCalledTimes(players.length);
    });
  }
});
