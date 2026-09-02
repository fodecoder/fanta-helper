import { describe, it, expect, vi } from "vitest";
import { upsertPlayer, batchUpsertPlayers, decidePlayerUpsert, PlayerUpsertConflict } from "./players";
import type { Queryable } from "./client";
import type { PlayerUpsertInput } from "./players";

type QueryCall = { text: string; params: unknown[] };

function fakeExecutor(responder: (call: QueryCall) => unknown[]) {
  const calls: QueryCall[] = [];
  const query = vi.fn(async (text: string, params: unknown[] = []) => {
    const call = { text, params };
    calls.push(call);
    const rows = responder(call);
    return { rows, rowCount: rows.length };
  });
  return { executor: { query } as unknown as Queryable, calls };
}

const player = (over: Record<string, unknown> = {}) => ({
  id: 1,
  fanta_id: 4431,
  sofifa_id: null,
  name: "Carnesecchi",
  nome_completo: "Marco Carnesecchi",
  team: "Atalanta",
  ruolo: "P",
  image_url: null,
  ...over,
});

const kind = (text: string) =>
  text.includes("UPDATE player")
    ? "update"
    : text.includes("INSERT INTO player")
      ? "insert"
      : text.includes("WHERE fanta_id = $1")
        ? "select-fanta"
        : text.includes("id <> $3")
          ? "select-blocker"
          : "select-nameteam";

describe("upsertPlayer", () => {
  it("updates the row found by fanta_id, changing team, without a duplicate", async () => {
    const { executor, calls } = fakeExecutor(({ text }) => {
      switch (kind(text)) {
        case "select-fanta":
          return [player({ team: "Atalanta" })];
        case "select-blocker":
          return [];
        case "update":
          return [player({ team: "Juventus" })];
        default:
          throw new Error(`unexpected: ${text}`);
      }
    });

    const result = await upsertPlayer(
      { name: "Carnesecchi", team: "Juventus", ruolo: "P", fanta_id: 4431 },
      executor,
    );

    expect(calls.map((c) => kind(c.text))).toEqual(["select-fanta", "select-blocker", "update"]);
    expect(result.inserted).toBe(false);
    expect(result.row.team).toBe("Juventus");
  });

  it("adopts the single name+team row when no fanta_id row exists (backfill)", async () => {
    const { executor, calls } = fakeExecutor(({ text }) => {
      switch (kind(text)) {
        case "select-fanta":
          return [];
        case "select-nameteam":
          return [player({ fanta_id: null })];
        case "update":
          return [player({ fanta_id: 4431 })];
        default:
          throw new Error(`unexpected: ${text}`);
      }
    });

    const result = await upsertPlayer(
      { name: "Carnesecchi", team: "Atalanta", ruolo: "P", fanta_id: 4431 },
      executor,
    );

    expect(calls.map((c) => kind(c.text))).toEqual(["select-fanta", "select-nameteam", "update"]);
    expect(result.row.fanta_id).toBe(4431);
  });

  it("inserts a new row when nothing matches", async () => {
    const { executor, calls } = fakeExecutor(({ text }) => {
      if (kind(text) === "insert") return [player({ id: 9 })];
      return [];
    });

    const result = await upsertPlayer(
      { name: "Nuovo", team: "Como", ruolo: "D", fanta_id: 9999, image_url: "https://img/x.png" },
      executor,
    );

    expect(result.inserted).toBe(true);
    const insert = calls.find((c) => kind(c.text) === "insert")!;
    expect(insert.params).toEqual(["Nuovo", "Como", "D", 9999, null, "https://img/x.png"]);
  });

  it("uses only a name+team lookup when fanta_id is absent", async () => {
    const { executor, calls } = fakeExecutor(({ text }) =>
      kind(text) === "select-nameteam" || kind(text) === "update"
        ? [player({ fanta_id: null, name: "X", team: "T" })]
        : [],
    );

    await upsertPlayer({ name: "X", team: "T", ruolo: "C" }, executor);

    expect(calls.map((c) => kind(c.text))).toEqual(["select-nameteam", "update"]);
  });

  it("throws PlayerUpsertConflict when the existing fanta_id differs from the file", async () => {
    const { executor } = fakeExecutor(({ text }) => {
      if (kind(text) === "select-fanta") return [];
      if (kind(text) === "select-nameteam") return [player({ fanta_id: 111 })];
      throw new Error(`unexpected: ${text}`);
    });

    await expect(
      upsertPlayer({ name: "Carnesecchi", team: "Atalanta", ruolo: "P", fanta_id: 4431 }, executor),
    ).rejects.toBeInstanceOf(PlayerUpsertConflict);
  });

  it("throws PlayerUpsertConflict when moving name/team would collide with another row", async () => {
    const { executor } = fakeExecutor(({ text }) => {
      if (kind(text) === "select-fanta") return [player({ team: "Atalanta" })];
      if (kind(text) === "select-blocker") return [{ id: 42 }];
      throw new Error(`unexpected: ${text}`);
    });

    await expect(
      upsertPlayer({ name: "Carnesecchi", team: "Juventus", ruolo: "P", fanta_id: 4431 }, executor),
    ).rejects.toBeInstanceOf(PlayerUpsertConflict);
  });
});

describe("decidePlayerUpsert", () => {
  const input: PlayerUpsertInput = { name: "X", team: "T", ruolo: "C", fanta_id: 10 };

  it("inserts when nothing matches", () => {
    expect(
      decidePlayerUpsert({ input, target: undefined, sameNameTeamCount: 0, blockerId: undefined }),
    ).toEqual({ action: "insert" });
  });

  it("conflicts on multiple name+team rows with no fanta_id target", () => {
    const d = decidePlayerUpsert({ input, target: undefined, sameNameTeamCount: 2, blockerId: undefined });
    expect(d).toMatchObject({ action: "conflict", message: expect.stringMatching(/più righe/) });
  });

  it("conflicts when the existing fanta_id differs", () => {
    const target = { id: 1, fanta_id: 999, name: "X", team: "T" };
    expect(decidePlayerUpsert({ input, target, sameNameTeamCount: 0, blockerId: undefined })).toMatchObject({
      action: "conflict",
    });
  });

  it("conflicts when moving name/team would collide with a blocker", () => {
    const target = { id: 1, fanta_id: 10, name: "Old", team: "T" };
    expect(decidePlayerUpsert({ input, target, sameNameTeamCount: 0, blockerId: 42 })).toMatchObject({
      action: "conflict",
      message: expect.stringMatching(/id 42/),
    });
  });

  it("updates the resolved target otherwise", () => {
    const target = { id: 7, fanta_id: null, name: "X", team: "T" };
    expect(decidePlayerUpsert({ input, target, sameNameTeamCount: 1, blockerId: undefined })).toEqual({
      action: "update",
      id: 7,
    });
  });
});

type BatchRow = {
  id: number;
  fanta_id: number | null;
  sofifa_id: number | null;
  name: string;
  nome_completo: string | null;
  team: string;
  ruolo: string;
  image_url: string | null;
};

function fakeBatchExecutor(seed: Partial<BatchRow>[] = []) {
  let nextId = 100;
  const table: BatchRow[] = seed.map((r, i) => ({
    id: i + 1,
    fanta_id: null,
    sofifa_id: null,
    nome_completo: null,
    ruolo: "P",
    image_url: null,
    name: "",
    team: "",
    ...r,
  }));
  const query = vi.fn(async (text: string, params: unknown[] = []) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.startsWith("SELECT id, fanta_id, name, team FROM player")) {
      return { rows: table.map((r) => ({ id: r.id, fanta_id: r.fanta_id, name: r.name, team: r.team })) };
    }
    if (t.startsWith("INSERT INTO player")) {
      const rows: BatchRow[] = [];
      for (let i = 0; i < params.length; i += 6) {
        const row: BatchRow = {
          id: nextId++,
          name: params[i] as string,
          team: params[i + 1] as string,
          ruolo: params[i + 2] as string,
          fanta_id: (params[i + 3] as number | null) ?? null,
          nome_completo: (params[i + 4] as string | null) ?? null,
          image_url: (params[i + 5] as string | null) ?? null,
          sofifa_id: null,
        };
        table.push(row);
        rows.push({ ...row });
      }
      return { rows };
    }
    if (t.startsWith("UPDATE player AS p")) {
      const rows: BatchRow[] = [];
      for (let i = 0; i < params.length; i += 7) {
        const row = table.find((r) => r.id === params[i])!;
        row.name = params[i + 1] as string;
        row.team = params[i + 2] as string;
        row.fanta_id = row.fanta_id ?? ((params[i + 4] as number | null) ?? null);
        rows.push({ ...row });
      }
      return { rows };
    }
    throw new Error(`unexpected: ${t}`);
  });
  return { executor: { query } as unknown as Queryable, query, table };
}

describe("batchUpsertPlayers", () => {
  it("does one SELECT then a single INSERT and a single UPDATE for a mixed input", async () => {
    const { executor, query } = fakeBatchExecutor([
      { id: 1, fanta_id: 4431, name: "Carnesecchi", team: "Atalanta" },
    ]);

    const outcomes = await batchUpsertPlayers(
      [
        { name: "Carnesecchi", team: "Juventus", ruolo: "P", fanta_id: 4431 },
        { name: "Nuovo", team: "Como", ruolo: "D", fanta_id: 9999 },
      ],
      executor,
    );

    const kinds = query.mock.calls.map(([t]) =>
      (t as string).includes("SELECT")
        ? "select"
        : (t as string).includes("INSERT")
          ? "insert"
          : "update",
    );
    expect(kinds).toEqual(["select", "insert", "update"]);
    expect(outcomes[0]).toMatchObject({ ok: true, result: { inserted: false, row: { team: "Juventus" } } });
    expect(outcomes[1]).toMatchObject({ ok: true, result: { inserted: true, row: { name: "Nuovo" } } });
  });

  it("returns a conflict (not a throw) when a fanta_id collides with a different one in DB", async () => {
    const { executor } = fakeBatchExecutor([{ id: 1, fanta_id: 111, name: "Tizio", team: "Inter" }]);

    const outcomes = await batchUpsertPlayers(
      [{ name: "Tizio", team: "Inter", ruolo: "P", fanta_id: 222 }],
      executor,
    );

    expect(outcomes[0]).toMatchObject({ ok: false, message: expect.stringMatching(/fanta_id/) });
  });

  it("collapses two rows with the same fanta_id into one write, both results pointing at that row", async () => {
    const { executor, query, table } = fakeBatchExecutor();

    const outcomes = await batchUpsertPlayers(
      [
        { name: "A", team: "T1", ruolo: "P", fanta_id: 7 },
        { name: "A2", team: "T2", ruolo: "P", fanta_id: 7 },
      ],
      executor,
    );

    const inserts = query.mock.calls.filter(([t]) => (t as string).includes("INSERT INTO player"));
    expect(inserts).toHaveLength(1);
    expect(table).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ ok: true, result: { inserted: true } });
    expect(outcomes[1]).toMatchObject({ ok: true, result: { inserted: false } });
    const r0 = (outcomes[0] as { result: { row: { id: number } } }).result.row;
    const r1 = (outcomes[1] as { result: { row: { id: number } } }).result.row;
    expect(r0.id).toBe(r1.id);
  });
});
