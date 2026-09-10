import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ManagerRow, PlayerRow } from "../db/types";

const h = vi.hoisted(() => {
  const managers: ManagerRow[] = [];
  const players: PlayerRow[] = [];
  const purchases: { player_id: number; manager_id: number; prezzo: number }[] = [];
  const clientRef: {
    current: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } | null;
  } = { current: null };

  function run(text: string, params: unknown[] = []) {
    const t = text.replace(/\s+/g, " ").trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(t)) return { rows: [], rowCount: 0 };
    if (t.startsWith("DELETE FROM purchase")) {
      purchases.length = 0;
      return { rows: [], rowCount: 0 };
    }
    if (t.startsWith("INSERT INTO purchase")) {
      purchases.push({
        player_id: params[1] as number,
        manager_id: params[2] as number,
        prezzo: params[3] as number,
      });
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`fake db: unhandled query: ${t.slice(0, 90)}`);
  }

  return {
    managers,
    players,
    purchases,
    clientRef,
    run,
    reset() {
      managers.length = 0;
      players.length = 0;
      purchases.length = 0;
      clientRef.current = null;
    },
  };
});

vi.mock("../db/client", () => ({
  pool: {
    query: (t: string, p: unknown[]) => h.run(t, p),
    connect: async () => {
      const client = { query: vi.fn((t: string, p: unknown[]) => h.run(t, p)), release: vi.fn() };
      h.clientRef.current = client;
      return client;
    },
  },
}));

vi.mock("../db/managers", () => ({
  listManagersByLeague: async () => h.managers,
}));

vi.mock("../db/players", () => ({
  listPlayers: async () => h.players,
}));

import { commitRosterImport, previewRosterImport } from "./rosterImport";

function manager(id: number, name: string): ManagerRow {
  return { id, league_id: 1, name, is_owner: false, user_id: null };
}

function player(id: number, fantaId: number): PlayerRow {
  return {
    id,
    fanta_id: fantaId,
    sofifa_id: null,
    name: `Player ${id}`,
    nome_completo: null,
    team: "Team",
    ruolo: "P",
    image_url: null,
    active: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
});

describe("previewRosterImport", () => {
  it("proposes the most similar manager per block and null below threshold", async () => {
    h.managers.push(manager(10, "Andrea Rossi"), manager(20, "Luca Bianchi"));
    const csv = ["Rossi FC,100,50", "Rossi FC,101,30", "$,$,$", "XYZ United,102,10"].join("\n");

    const result = await previewRosterImport(1, csv);

    expect(result.blocks).toHaveLength(2);
    const rossi = result.blocks.find((b) => b.csvTeamName === "Rossi FC")!;
    expect(rossi.rowCount).toBe(2);
    expect(rossi.suggestedManagerId).toBe(10);
    expect(rossi.suggestedManagerName).toBe("Andrea Rossi");

    const xyz = result.blocks.find((b) => b.csvTeamName === "XYZ United")!;
    expect(xyz.rowCount).toBe(1);
    expect(xyz.suggestedManagerId).toBeNull();
    expect(xyz.suggestedManagerName).toBeNull();

    expect(h.clientRef.current).toBeNull();
  });
});

describe("commitRosterImport", () => {
  it("imports every block using the mapping, not the CSV team name", async () => {
    h.managers.push(manager(10, "Andrea Rossi"), manager(20, "Luca Bianchi"));
    h.players.push(player(1, 100), player(2, 101), player(3, 200));
    const csv = ["Alpha,100,50", "Alpha,101,30", "$,$,$", "Beta,200,15"].join("\n");

    const report = await commitRosterImport(1, csv, { Alpha: 20, Beta: 10 });

    expect(report.imported).toBe(3);
    expect(report.discarded).toHaveLength(0);
    expect(h.purchases).toEqual([
      { player_id: 1, manager_id: 20, prezzo: 50 },
      { player_id: 2, manager_id: 20, prezzo: 30 },
      { player_id: 3, manager_id: 10, prezzo: 15 },
    ]);
  });

  it("discards an unmapped block without failing the whole import", async () => {
    h.managers.push(manager(10, "Andrea Rossi"));
    h.players.push(player(1, 100), player(2, 200));
    const csv = ["Alpha,100,50", "$,$,$", "Beta,200,15"].join("\n");

    const report = await commitRosterImport(1, csv, { Alpha: 10 });

    expect(report.imported).toBe(1);
    expect(report.unknownManagers).toEqual(["Beta"]);
    expect(report.discarded).toEqual([
      expect.objectContaining({
        managerName: "Beta",
        fantaId: "200",
        reason: "blocco non mappato a un manager",
      }),
    ]);
    expect(h.purchases).toEqual([{ player_id: 1, manager_id: 10, prezzo: 50 }]);
  });

  it("rejects a mapping that assigns one manager to two blocks before writing", async () => {
    h.managers.push(manager(10, "Andrea Rossi"), manager(20, "Luca Bianchi"));
    h.players.push(player(1, 100), player(2, 200));
    const csv = ["Alpha,100,50", "$,$,$", "Beta,200,15"].join("\n");

    await expect(commitRosterImport(1, csv, { Alpha: 10, Beta: 10 })).rejects.toThrow(
      /un manager non può ricevere più di un blocco/,
    );
    expect(h.clientRef.current).toBeNull();
    expect(h.purchases).toHaveLength(0);
  });

  it("rejects a mapping pointing at a manager outside the league", async () => {
    h.managers.push(manager(10, "Andrea Rossi"));
    h.players.push(player(1, 100));
    const csv = "Alpha,100,50";

    await expect(commitRosterImport(1, csv, { Alpha: 99 })).rejects.toThrow(
      /non appartiene alla lega/,
    );
    expect(h.clientRef.current).toBeNull();
  });
});
