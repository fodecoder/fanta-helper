import { describe, expect, it } from "vitest";
import { scaleValuationAmounts, valuationScaleFactor } from "./valuationScale";

describe("valuationScaleFactor", () => {
  it("returns 1 for the standard 1000-credit budget", () => {
    expect(valuationScaleFactor(1000)).toBe(1);
  });

  it("scales proportionally for a smaller league budget", () => {
    expect(valuationScaleFactor(500)).toBe(0.5);
  });

  it("scales proportionally for a larger league budget", () => {
    expect(valuationScaleFactor(1500)).toBe(1.5);
  });
});

describe("scaleValuationAmounts", () => {
  const base = { target: 10, fair_value: 20, max_bid: 30, panic_price: 40 };

  it("returns the same object when the factor is 1", () => {
    expect(scaleValuationAmounts(base, 1)).toBe(base);
  });

  it("scales and rounds every amount field", () => {
    const result = scaleValuationAmounts(base, 0.5);
    expect(result).toEqual({ target: 5, fair_value: 10, max_bid: 15, panic_price: 20 });
  });

  it("rounds fractional results", () => {
    const result = scaleValuationAmounts({ target: 3, fair_value: 3, max_bid: 3, panic_price: 3 }, 1.15);
    expect(result).toEqual({ target: 3, fair_value: 3, max_bid: 3, panic_price: 3 });
  });

  it("preserves unrelated fields on the input object", () => {
    const withExtra = { ...base, name: "Esempio", player_id: 7 };
    const result = scaleValuationAmounts(withExtra, 2);
    expect(result).toMatchObject({ name: "Esempio", player_id: 7, target: 20 });
  });
});
