import { describe, it, expect, vi } from "vitest";
import { upsertPlayer, PlayerUpsertConflict } from "./players";
import type { Queryable } from "./client";

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
