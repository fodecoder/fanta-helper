import { describe, expect, it } from "vitest";
import { valuationEntrySchema, valuationImportEnvelopeSchema } from "./valuation";

const validEntry = {
  name: "Osimhen",
  team: "Napoli",
  ruolo: "A",
  tier: "top",
  target: 60,
  fair_value: 55,
  max_bid: 70,
  panic_price: 90,
  confidence: "high",
};

describe("valuationEntrySchema", () => {
  it("accepts a fully valid entry", () => {
    expect(valuationEntrySchema.safeParse(validEntry).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = valuationEntrySchema.safeParse({ ...validEntry, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative numeric field", () => {
    const result = valuationEntrySchema.safeParse({ ...validEntry, target: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a ruolo outside the enum", () => {
    const result = valuationEntrySchema.safeParse({ ...validEntry, ruolo: "X" });
    expect(result.success).toBe(false);
  });

  it("rejects a confidence outside the enum", () => {
    const result = valuationEntrySchema.safeParse({ ...validEntry, confidence: "medium-high" });
    expect(result.success).toBe(false);
  });
});

describe("valuationImportEnvelopeSchema", () => {
  it("accepts a well-formed envelope without validating player entries", () => {
    const result = valuationImportEnvelopeSchema.safeParse({
      league_name: "Lega Test",
      generated_at: new Date().toISOString(),
      players: [{ this: "is not a valid entry" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing league_name", () => {
    const result = valuationImportEnvelopeSchema.safeParse({
      generated_at: new Date().toISOString(),
      players: [validEntry],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid generated_at", () => {
    const result = valuationImportEnvelopeSchema.safeParse({
      league_name: "Lega Test",
      generated_at: "not-a-date",
      players: [validEntry],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty players array", () => {
    const result = valuationImportEnvelopeSchema.safeParse({
      league_name: "Lega Test",
      generated_at: new Date().toISOString(),
      players: [],
    });
    expect(result.success).toBe(false);
  });
});
