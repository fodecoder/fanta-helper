import { describe, it, expect, vi } from "vitest";
import { upsertPlayer } from "./players";
import type { Queryable } from "./client";

type QueryCall = { text: string; params: unknown[] };

function fakeExecutor(responder: (call: QueryCall) => { rows: unknown[]; rowCount?: number }) {
  const calls: QueryCall[] = [];
  const query = vi.fn(async (text: string, params: unknown[] = []) => {
    const call = { text, params };
    calls.push(call);
    const res = responder(call);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  });
  return { executor: { query } as unknown as Queryable, calls };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  fanta_id: 4431,
  sofifa_id: null,
  name: "Carnesecchi",
  nome_completo: "Marco Carnesecchi",
  team: "Juventus",
  ruolo: "P",
  image_url: null,
  inserted: false,
  ...over,
});

describe("upsertPlayer", () => {
  it("updates the existing row by fanta_id, changing team (no duplicate)", async () => {
    const { executor, calls } = fakeExecutor((call) => {
      if (call.text.includes("UPDATE player")) return { rows: [row({ team: "Juventus" })] };
      throw new Error(`unexpected query: ${call.text}`);
    });

    const result = await upsertPlayer(
      { name: "Carnesecchi", team: "Juventus", ruolo: "P", fanta_id: 4431 },
      executor,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toMatch(/UPDATE player[\s\S]*WHERE fanta_id = \$4/);
    expect(result.inserted).toBe(false);
    expect(result.row.team).toBe("Juventus");
  });

  it("falls back to name+team insert when no row has that fanta_id", async () => {
    const { executor, calls } = fakeExecutor((call) => {
      if (call.text.includes("UPDATE player")) return { rows: [] };
      if (call.text.includes("INSERT INTO player")) return { rows: [row({ inserted: true })] };
      throw new Error(`unexpected query: ${call.text}`);
    });

    const result = await upsertPlayer(
      { name: "Nuovo", team: "Como", ruolo: "D", fanta_id: 9999 },
      executor,
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]!.text).toMatch(/ON CONFLICT \(name, team\)/);
    expect(result.inserted).toBe(true);
  });

  it("uses only the name+team conflict path when fanta_id is absent", async () => {
    const { executor, calls } = fakeExecutor(() => ({ rows: [row({ fanta_id: null })] }));

    await upsertPlayer({ name: "X", team: "T", ruolo: "C" }, executor);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toMatch(/INSERT INTO player/);
    expect(calls[0]!.text).toMatch(/ON CONFLICT \(name, team\)/);
  });

  it("passes nome_completo and image_url through as parameters", async () => {
    const { executor, calls } = fakeExecutor(() => ({ rows: [row()] }));

    await upsertPlayer(
      {
        name: "X",
        team: "T",
        ruolo: "A",
        nome_completo: "Xavier Full",
        image_url: "https://img/x.png",
      },
      executor,
    );

    expect(calls[0]!.params).toEqual(["X", "T", "A", null, "Xavier Full", "https://img/x.png"]);
  });
});
