import { describe, expect, it } from "vitest";
import { computeAdjustedMaxBid, MIN_SLOT_RESERVE } from "./maxBid";
import type { RoleSlotStatus } from "./purchase";

function slot(ruolo: RoleSlotStatus["ruolo"], total: number, used: number): RoleSlotStatus {
  return { ruolo, total, used, free: total - used };
}

describe("computeAdjustedMaxBid", () => {
  it("returns 0 when the roster is already complete", () => {
    const result = computeAdjustedMaxBid({
      residuo: 50,
      slots: [slot("P", 3, 3), slot("D", 8, 8), slot("C", 8, 8), slot("A", 6, 6)],
    });
    expect(result).toBe(0);
  });

  it("reserves nothing when this is the last free slot", () => {
    const result = computeAdjustedMaxBid({
      residuo: 50,
      slots: [slot("P", 3, 3), slot("D", 8, 8), slot("C", 8, 8), slot("A", 6, 5)],
    });
    expect(result).toBe(50);
  });

  it("subtracts the floor reserve across mixed roles for the remaining slots", () => {
    const result = computeAdjustedMaxBid({
      residuo: 45,
      slots: [slot("P", 3, 2), slot("D", 8, 6), slot("C", 8, 6), slot("A", 6, 5)],
    });
    // free slots: P=1, D=2, C=2, A=1 -> total 6, minus the slot being filled now = 5
    expect(result).toBe(45 - 5 * MIN_SLOT_RESERVE);
  });

  it("clamps to 0 when the reserve would exceed the residuo", () => {
    const result = computeAdjustedMaxBid({
      residuo: 3,
      slots: [slot("P", 3, 0), slot("D", 8, 0), slot("C", 8, 0), slot("A", 6, 0)],
    });
    expect(result).toBe(0);
  });

  it("treats a negative slot.free as 0 free slots for that role", () => {
    const result = computeAdjustedMaxBid({
      residuo: 20,
      slots: [
        { ruolo: "P", total: 3, used: 4, free: -1 },
        slot("D", 8, 8),
        slot("C", 8, 8),
        slot("A", 6, 5),
      ],
    });
    // only A contributes 1 free slot, minus the slot being filled now = 0 reserved
    expect(result).toBe(20);
  });
});
