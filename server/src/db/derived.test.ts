import { describe, it, expect, vi, beforeEach } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./client", () => ({ pool: { query } }));

import { getManagerAuctionStatuses } from "./derived";

const baseRow = {
  manager_id: 1,
  manager_name: "Io",
  manager_is_owner: true,
  user_name: null,
  user_avatar: null,
  user_avatar_color: null,
  budget: 1000,
  roster_config: { P: 3, D: 8, C: 8, A: 6 },
  budget_target_by_role: { P: 8, D: 16, C: 28, A: 48 },
  spent: "0",
  used_p: "0",
  used_d: "0",
  used_c: "0",
  used_a: "0",
  spent_p: "0",
  spent_d: "0",
  spent_c: "0",
  spent_a: "0",
};

beforeEach(() => query.mockReset());

describe("getManagerAuctionStatuses spentByRole", () => {
  it("derives targetCredits/residuo/state per role from the per-role spend", async () => {
    query.mockResolvedValueOnce({
      rows: [{ ...baseRow, spent: "500", spent_a: "500" }],
    });

    const [status] = await getManagerAuctionStatuses(1);
    const a = status!.spentByRole.find((r) => r.ruolo === "A")!;
    expect(a).toMatchObject({ spent: 500, targetCredits: 480, residuo: -20, state: "over" });
    const p = status!.spentByRole.find((r) => r.ruolo === "P")!;
    expect(p).toMatchObject({ spent: 0, targetCredits: 80, residuo: 80, state: "ok" });
  });

  it("returns all-ok spentByRole for a manager with no purchases", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...baseRow }] });

    const [status] = await getManagerAuctionStatuses(1);
    expect(status!.spentByRole.map((r) => r.state)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(status!.spentByRole.every((r) => r.spent === 0)).toBe(true);
  });

  it("selects per-role FILTER aggregates in the SQL", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await getManagerAuctionStatuses(1);
    const sql = query.mock.calls[0]![0] as string;
    expect(sql).toContain("SUM(purchase.prezzo) FILTER (WHERE player.ruolo = 'P')");
    expect(sql).toContain("SUM(purchase.prezzo) FILTER (WHERE player.ruolo = 'A')");
    expect(sql).toContain("league.budget_target_by_role");
  });
});
