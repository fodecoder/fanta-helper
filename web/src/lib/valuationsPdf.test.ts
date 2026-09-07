import { describe, expect, it } from "vitest";
import type { Role } from "@fanta-helper/shared";
import {
  buildValuationsPdfModel,
  deriveSituazione,
  NOTE_MAX_LENGTH,
  type BuildValuationsPdfModelInput,
  type ValuationsPdfInputRow,
} from "./valuationsPdf";

function row(over: Partial<ValuationsPdfInputRow> & { playerId: number; ruolo: Role }): ValuationsPdfInputRow {
  return {
    name: `P${over.playerId}`,
    team: "TeamX",
    tier: "Media",
    target: 10,
    maxBid: 15,
    score: 5,
    reliability: 0.6,
    lineupStato: null,
    dataMissing: false,
    needsRoleCheck: false,
    note: null,
    purchased: false,
    ...over,
  };
}

function input(rows: ValuationsPdfInputRow[]): BuildValuationsPdfModelInput {
  return {
    leagueName: "Lega Dieci",
    budget: 500,
    budgetTargetByRole: { P: 8, D: 16, C: 28, A: 48 },
    updatedAt: new Date("2026-09-07T10:00:00Z"),
    rows,
  };
}

describe("buildValuationsPdfModel", () => {
  const model = buildValuationsPdfModel(
    input([
      row({ playerId: 1, ruolo: "A", name: "Alfa", score: 9 }),
      row({ playerId: 2, ruolo: "A", name: "Bravo", score: 3 }),
      row({ playerId: 3, ruolo: "P", name: "Charlie", score: 7 }),
      row({ playerId: 4, ruolo: "D", name: "Delta", score: 4 }),
      row({ playerId: 5, ruolo: "D", name: "Echo", score: 8 }),
      row({ playerId: 6, ruolo: "C", name: "Foxtrot", score: 6 }),
    ]),
  );

  it("produce 4 sezioni nell'ordine P/D/C/A", () => {
    expect(model.sections.map((s) => s.ruolo)).toEqual(["P", "D", "C", "A"]);
  });

  it("conta i giocatori per ruolo", () => {
    const byRole = Object.fromEntries(model.sections.map((s) => [s.ruolo, s.count]));
    expect(byRole).toEqual({ P: 1, D: 2, C: 1, A: 2 });
    expect(model.sections[1]!.title).toBe("Difensori (2)");
  });

  it("numera le righe da 1 in ogni sezione e ordina per score decrescente", () => {
    const attaccanti = model.sections[3]!;
    expect(attaccanti.rows.map((r) => r.index)).toEqual([1, 2]);
    expect(attaccanti.rows.map((r) => r.name)).toEqual(["Alfa", "Bravo"]);
    const difensori = model.sections[1]!;
    expect(difensori.rows.map((r) => r.index)).toEqual([1, 2]);
    expect(difensori.rows[0]!.name).toBe("Echo");
  });

  it("calcola gli indicatori riparto sul budget reale della lega", () => {
    const att = model.roleBudgets.find((r) => r.ruolo === "A")!;
    expect(att.targetPercent).toBe(48);
    expect(att.targetCredits).toBe(240); // 48% di 500, non del template
    const por = model.roleBudgets.find((r) => r.ruolo === "P")!;
    expect(por.targetCredits).toBe(40);
    expect(att.text).toContain("240 crediti");
  });

  it("intestazione e sottotitolo dal budget/lega/data reali", () => {
    expect(model.title).toBe("Guida Asta Fantacalcio 2026/27");
    expect(model.subtitle).toBe(
      "Lega Dieci · Budget 500 crediti · Valutazioni aggiornate al 07/09/2026",
    );
  });

  it("tronca la nota personale a NOTE_MAX_LENGTH", () => {
    const long = "x".repeat(120);
    const m = buildValuationsPdfModel(input([row({ playerId: 1, ruolo: "C", note: long })]));
    const cell = m.sections[2]!.rows[0]!.acquistatoNote;
    expect(cell.length).toBeLessThanOrEqual(NOTE_MAX_LENGTH);
    expect(cell.endsWith("…")).toBe(true);
  });

  it("marca i giocatori acquistati", () => {
    const m = buildValuationsPdfModel(
      input([row({ playerId: 1, ruolo: "C", purchased: true, note: "occhio" })]),
    );
    expect(m.sections[2]!.rows[0]!.acquistatoNote).toBe("Preso · occhio");
  });
});

describe("deriveSituazione", () => {
  const base = row({ playerId: 1, ruolo: "A" });

  it("dati mancanti => Da verificare", () => {
    expect(deriveSituazione({ ...base, dataMissing: true })).toBe("Da verificare");
  });

  it("titolare affidabile => In forma", () => {
    expect(deriveSituazione({ ...base, lineupStato: "titolare", reliability: 0.9 })).toBe("In forma");
  });

  it("panchina => Sottotono", () => {
    expect(deriveSituazione({ ...base, lineupStato: "panchina" })).toBe("Sottotono");
  });

  it("nessun segnale affidabile => stringa vuota", () => {
    expect(deriveSituazione({ ...base, lineupStato: null, reliability: 0.6 })).toBe("");
  });
});
