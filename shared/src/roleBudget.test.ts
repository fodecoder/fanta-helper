import { describe, expect, it } from "vitest";
import { computeRoleBudget, ROLE_BUDGET_APPROACH_THRESHOLD } from "./roleBudget";

const target = { P: 8, D: 16, C: 28, A: 48 };

describe("computeRoleBudget", () => {
  it("derives targetCredits and residuo from budget and target percent", () => {
    const rows = computeRoleBudget(1000, target, { P: 0, D: 0, C: 0, A: 0 });
    const a = rows.find((r) => r.ruolo === "A")!;
    expect(a.targetCredits).toBe(480);
    expect(a.residuo).toBe(480);
    expect(a.state).toBe("ok");
  });

  it("flags 'approaching' at or above the threshold and 'over' beyond target", () => {
    const rows = computeRoleBudget(1000, target, {
      P: 81,
      D: 150,
      C: Math.ceil(ROLE_BUDGET_APPROACH_THRESHOLD * 280),
      A: 0,
    });
    expect(rows.find((r) => r.ruolo === "P")!.state).toBe("over");
    expect(rows.find((r) => r.ruolo === "D")!.state).toBe("approaching");
    expect(rows.find((r) => r.ruolo === "C")!.state).toBe("approaching");
    expect(rows.find((r) => r.ruolo === "A")!.state).toBe("ok");
  });

  it("stays 'ok' when the target quota is zero and nothing is spent", () => {
    const rows = computeRoleBudget(1000, { P: 0, D: 0, C: 0, A: 100 }, { P: 0, D: 0, C: 0, A: 0 });
    expect(rows.find((r) => r.ruolo === "P")!.state).toBe("ok");
  });
});
