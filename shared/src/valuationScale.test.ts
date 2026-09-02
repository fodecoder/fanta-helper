import { describe, expect, it } from "vitest";
import {
  budgetPercentToCredits,
  creditsToBudgetPercent,
  fvmScaleFactor,
  scaleFvm,
  scaleValuationAmounts,
  valuationScaleFactor,
} from "./valuationScale";

describe("fvmScaleFactor", () => {
  it("returns 1 at the 500-credit FVM base", () => {
    expect(fvmScaleFactor(500)).toBe(1);
  });

  it("doubles for a 1000-credit league", () => {
    expect(fvmScaleFactor(1000)).toBe(2);
  });

  it("scales 750 to 1.5 and 250 to 0.5", () => {
    expect(fvmScaleFactor(750)).toBe(1.5);
    expect(fvmScaleFactor(250)).toBe(0.5);
  });
});

describe("scaleFvm", () => {
  it("multiplies and rounds", () => {
    expect(scaleFvm(37, 2)).toBe(74);
    expect(scaleFvm(37, 1.5)).toBe(56);
  });
});

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

describe("budgetPercentToCredits", () => {
  it("maps 0% to 0 credits", () => {
    expect(budgetPercentToCredits(0, 500)).toBe(0);
  });

  it("maps 100% to the full budget", () => {
    expect(budgetPercentToCredits(100, 500)).toBe(500);
    expect(budgetPercentToCredits(100, 1000)).toBe(1000);
  });

  it("rounds the credit amount", () => {
    expect(budgetPercentToCredits(33, 500)).toBe(165);
  });

  it("scales with the league budget", () => {
    expect(budgetPercentToCredits(25, 1000)).toBe(250);
    expect(budgetPercentToCredits(25, 500)).toBe(125);
  });
});

describe("creditsToBudgetPercent", () => {
  it("is the inverse of budgetPercentToCredits", () => {
    expect(creditsToBudgetPercent(250, 1000)).toBe(25);
    expect(creditsToBudgetPercent(0, 500)).toBe(0);
    expect(creditsToBudgetPercent(500, 500)).toBe(100);
  });

  it("round-trips through budgetPercentToCredits for round values", () => {
    const credits = budgetPercentToCredits(40, 500);
    expect(Math.round(creditsToBudgetPercent(credits, 500))).toBe(40);
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
