import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertPlayer, replaceQuotationsForSeasonTx } = vi.hoisted(() => ({
  upsertPlayer: vi.fn(),
  replaceQuotationsForSeasonTx: vi.fn(),
}));

vi.mock("../db/players", () => ({ upsertPlayer }));
vi.mock("../db/quotation", () => ({ replaceQuotationsForSeasonTx }));
vi.mock("../db/client", () => ({
  pool: { connect: async () => ({ query: vi.fn(), release: vi.fn() }) },
}));

import { importListoneFromCsv } from "./listoneImport";

const FIXTURE = readFileSync(
  fileURLToPath(new URL("../test/fixtures/listone-2026-27-fantaasta.csv", import.meta.url)),
  "utf8",
);

let nextId = 1;

beforeEach(() => {
  vi.clearAllMocks();
  nextId = 1;
  upsertPlayer.mockImplementation(async (input: { name: string; team: string }) => ({
    row: { id: nextId++, name: input.name, team: input.team },
    inserted: true,
  }));
  replaceQuotationsForSeasonTx.mockImplementation(async (_c: unknown, _s: string, rows: unknown[]) => rows.length);
});

describe("importListoneFromCsv — positional Lista FantaAsta", () => {
  it("imports the attached file with no mass discard", async () => {
    const report = await importListoneFromCsv(FIXTURE, "2026-27");

    expect(report.inserted).toBeGreaterThan(500);
    expect(report.discarded.length).toBeLessThan(5);
    expect(report.quotation?.season).toBe("2026-27");
    expect(report.quotation!.written).toBeGreaterThan(500);
  });

  it("passes nome_completo and image_url to the upsert", async () => {
    await importListoneFromCsv(FIXTURE, "2026-27");
    const first = upsertPlayer.mock.calls[0]![0];
    expect(first).toMatchObject({
      name: "Carnesecchi",
      nome_completo: "Marco Carnesecchi",
      team: "Atalanta",
      fanta_id: 4431,
    });
    expect(first.image_url).toContain("4431.png");
  });

  it("requires a season for the positional file", async () => {
    await expect(importListoneFromCsv(FIXTURE, null)).rejects.toThrow(/stagione/i);
  });

  it("does not discard a row in bulk when a single optional column is empty", async () => {
    const csv = "5,Sportiello,Marco Sportiello,P,Por,,,,,Atalanta,,,destro,Italia,,,0,,";
    const report = await importListoneFromCsv(csv, "2026-27");
    expect(report.discarded).toHaveLength(0);
    expect(report.inserted).toBe(1);
    expect(upsertPlayer.mock.calls[0]![0]).toMatchObject({ name: "Sportiello", team: "Atalanta" });
  });

  it("reimport of the same fanta_id with a different team updates via fanta_id", async () => {
    await importListoneFromCsv("4431,Carnesecchi,Marco C.,P,Por,16,16,16,16,Atalanta,52,52", "2026-27");
    await importListoneFromCsv("4431,Carnesecchi,Marco C.,P,Por,16,16,16,16,Juventus,52,52", "2026-27");

    const teams = upsertPlayer.mock.calls.map((c) => c[0]);
    expect(teams[0]).toMatchObject({ fanta_id: 4431, team: "Atalanta" });
    expect(teams[1]).toMatchObject({ fanta_id: 4431, team: "Juventus" });
  });
});

describe("importListoneFromCsv — header CSV (no regression)", () => {
  it("delegates to the header path and writes no quotation", async () => {
    const csv = ["R,Nome,Squadra,Id", "P,Meret,Napoli,200", "D,Di Lorenzo,Napoli,201"].join("\n");
    const report = await importListoneFromCsv(csv, "2026-27");
    expect(report.inserted).toBe(2);
    expect(report.quotation).toBeNull();
    expect(replaceQuotationsForSeasonTx).not.toHaveBeenCalled();
  });
});
