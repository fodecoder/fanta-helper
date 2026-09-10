import { describe, it, expect } from "vitest";
import { diceCoefficient } from "./stringSimilarity";

describe("diceCoefficient", () => {
  it("is 1 for equal strings ignoring case and surrounding space", () => {
    expect(diceCoefficient("Rossi FC", "  rossi fc ")).toBe(1);
  });

  it("is 0 for strings sharing no bigram", () => {
    expect(diceCoefficient("abc", "xyz")).toBe(0);
  });

  it("is between 0 and 1 for partial overlap", () => {
    const score = diceCoefficient("night", "nacht");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });
});
