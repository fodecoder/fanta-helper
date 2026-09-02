import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake DB in memoria: implementa il minimo SQL toccato dall'import (SELECT
// anagrafica, INSERT/UPDATE batch player, DELETE/INSERT batch quotation) così
// il test verifica il comportamento reale di `batchUpsertPlayers` /
// `replaceQuotationsForSeasonTx` e può contare i round-trip verso il client.
const h = vi.hoisted(() => {
  interface Row {
    id: number;
    fanta_id: number | null;
    sofifa_id: number | null;
    name: string;
    nome_completo: string | null;
    team: string;
    ruolo: string;
    image_url: string | null;
    active: boolean;
  }
  const table: Row[] = [];
  const quotations: { player_id: unknown; season: unknown }[] = [];
  let nextId = 1;

  function run(text: string, params: unknown[] = []) {
    const t = text.replace(/\s+/g, " ").trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(t)) return { rows: [], rowCount: 0 };
    if (t.startsWith("DELETE FROM quotation")) {
      quotations.length = 0;
      return { rows: [], rowCount: 0 };
    }
    if (t.startsWith("SELECT id, fanta_id, name, team FROM player")) {
      return {
        rows: table.map((r) => ({ id: r.id, fanta_id: r.fanta_id, name: r.name, team: r.team })),
        rowCount: table.length,
      };
    }
    if (t.startsWith("SELECT id, name, team, active FROM player")) {
      return {
        rows: table.map((r) => ({ id: r.id, name: r.name, team: r.team, active: r.active })),
        rowCount: table.length,
      };
    }
    if (t.startsWith("UPDATE player SET active = false WHERE id = ANY($1)")) {
      const ids = new Set(params[0] as number[]);
      const hit = table.filter((r) => ids.has(r.id));
      for (const r of hit) r.active = false;
      return { rows: [], rowCount: hit.length };
    }
    if (t.startsWith("UPDATE player SET active = true WHERE id = ANY($1)")) {
      const ids = new Set(params[0] as number[]);
      const hit = table.filter((r) => ids.has(r.id));
      for (const r of hit) r.active = true;
      return { rows: [], rowCount: hit.length };
    }
    if (t.startsWith("INSERT INTO player")) {
      const out: Row[] = [];
      for (let i = 0; i < params.length; i += 6) {
        const row: Row = {
          id: nextId++,
          name: params[i] as string,
          team: params[i + 1] as string,
          ruolo: params[i + 2] as string,
          fanta_id: (params[i + 3] as number | null) ?? null,
          nome_completo: (params[i + 4] as string | null) ?? null,
          image_url: (params[i + 5] as string | null) ?? null,
          sofifa_id: null,
          active: true,
        };
        table.push(row);
        out.push({ ...row });
      }
      return { rows: out, rowCount: out.length };
    }
    if (t.startsWith("UPDATE player AS p")) {
      const out: Row[] = [];
      for (let i = 0; i < params.length; i += 7) {
        const row = table.find((r) => r.id === params[i]);
        if (!row) continue;
        row.name = params[i + 1] as string;
        row.team = params[i + 2] as string;
        row.ruolo = params[i + 3] as string;
        row.fanta_id = row.fanta_id ?? ((params[i + 4] as number | null) ?? null);
        row.nome_completo = (params[i + 5] as string | null) ?? row.nome_completo;
        row.image_url = (params[i + 6] as string | null) ?? row.image_url;
        out.push({ ...row });
      }
      return { rows: out, rowCount: out.length };
    }
    if (t.startsWith("INSERT INTO quotation")) {
      for (let i = 0; i < params.length; i += 5) {
        quotations.push({ player_id: params[i], season: params[i + 1] });
      }
      return { rows: [], rowCount: params.length / 5 };
    }
    throw new Error(`fake db: unhandled query: ${t.slice(0, 90)}`);
  }

  const clientRef: { current: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } | null } = {
    current: null,
  };

  return {
    table,
    quotations,
    run,
    clientRef,
    seed(row: Partial<Row> & Pick<Row, "name" | "team">) {
      table.push({
        id: nextId++,
        fanta_id: null,
        sofifa_id: null,
        nome_completo: null,
        ruolo: "P",
        image_url: null,
        active: true,
        ...row,
      });
    },
    reset() {
      table.length = 0;
      quotations.length = 0;
      nextId = 1;
      clientRef.current = null;
    },
  };
});

vi.mock("../db/client", () => ({
  pool: {
    query: (t: string, p: unknown[]) => h.run(t, p),
    connect: async () => {
      const client = { query: vi.fn((t: string, p: unknown[]) => h.run(t, p)), release: vi.fn() };
      h.clientRef.current = client;
      return client;
    },
  },
}));

import { importListoneFromCsv } from "./listoneImport";

const FIXTURE = readFileSync(
  fileURLToPath(new URL("../test/fixtures/listone-2026-27-fantaasta.csv", import.meta.url)),
  "utf8",
);

const rowByFantaId = (id: number) => h.table.find((r) => r.fanta_id === id);

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
});

describe("importListoneFromCsv — positional Lista FantaAsta", () => {
  it("imports the attached file with no mass discard", async () => {
    const report = await importListoneFromCsv(FIXTURE, "2026-27");

    expect(report.inserted).toBeGreaterThan(500);
    expect(report.discarded.length).toBeLessThan(5);
    expect(report.quotation?.season).toBe("2026-27");
    expect(report.quotation!.written).toBeGreaterThan(500);
    expect(h.quotations.length).toBeGreaterThan(500);
  });

  it("runs the whole import in a few dozen DB round-trips, not hundreds", async () => {
    await importListoneFromCsv(FIXTURE, "2026-27");

    // ~587 righe: BEGIN + 1 SELECT + ~3 INSERT player + DELETE quotation +
    // ~3 INSERT quotation + COMMIT. Il regressione da guardare è il ritorno
    // al ciclo riga-per-riga (centinaia di chiamate).
    expect(h.clientRef.current!.query.mock.calls.length).toBeLessThan(30);
  });

  it("parses the real file with quoted nicknames in unquoted fields", async () => {
    const report = await importListoneFromCsv(FIXTURE, "2026-27");
    expect(report.inserted).toBeGreaterThan(580);
    expect(report.discarded.length).toBeLessThan(5);

    expect(rowByFantaId(7625)).toMatchObject({ nome_completo: 'Goncalves "Pote" Pedro' });
  });

  it("passes nome_completo and image_url through to the written row", async () => {
    await importListoneFromCsv(FIXTURE, "2026-27");
    const carnesecchi = rowByFantaId(4431)!;
    expect(carnesecchi).toMatchObject({
      name: "Carnesecchi",
      nome_completo: "Marco Carnesecchi",
      team: "Atalanta",
    });
    expect(carnesecchi.image_url).toContain("4431.png");
  });

  it("requires a season for the positional file", async () => {
    await expect(importListoneFromCsv(FIXTURE, null)).rejects.toThrow(/stagione/i);
  });

  it("does not discard a row in bulk when a single optional column is empty", async () => {
    const csv = "5,Sportiello,Marco Sportiello,P,Por,,,,,Atalanta,,,destro,Italia,,,0,,";
    const report = await importListoneFromCsv(csv, "2026-27");
    expect(report.discarded).toHaveLength(0);
    expect(report.inserted).toBe(1);
    expect(h.table[0]).toMatchObject({ name: "Sportiello", team: "Atalanta" });
  });

  it("turns an identity conflict into a discard instead of aborting the import", async () => {
    h.seed({ name: "Tizio", team: "Inter", fanta_id: 999 });

    const csv = [
      "1,Tizio,Tizio Uno,P,Por,1,1,1,1,Inter,1,1",
      "2,Caio,Caio Due,D,Dc,1,1,1,1,Como,1,1",
    ].join("\n");
    const report = await importListoneFromCsv(csv, "2026-27");

    expect(report.discarded).toHaveLength(1);
    expect(report.discarded[0]).toMatchObject({ name: "Tizio", reason: /fanta_id/ });
    expect(report.inserted).toBe(1);
  });

  it("reimport of the same fanta_id with a different team updates via fanta_id", async () => {
    await importListoneFromCsv("4431,Carnesecchi,Marco C.,P,Por,16,16,16,16,Atalanta,52,52", "2026-27");
    await importListoneFromCsv("4431,Carnesecchi,Marco C.,P,Por,16,16,16,16,Juventus,52,52", "2026-27");

    expect(h.table).toHaveLength(1);
    expect(h.table[0]).toMatchObject({ fanta_id: 4431, team: "Juventus" });
  });
});

describe("importListoneFromCsv — pruning giocatori assenti", () => {
  const line = (id: number, name: string, team: string) =>
    `${id},${name},${name} Full,P,Por,1,1,1,1,${team},1,1`;

  it("disattiva un giocatore non più nel listone e riattiva chi rientra", async () => {
    const first = [line(1, "Aaa", "Inter"), line(2, "Bbb", "Como"), line(3, "Ccc", "Roma")].join(
      "\n",
    );
    await importListoneFromCsv(first, "2026-27");

    const second = [line(1, "Aaa", "Inter"), line(2, "Bbb", "Como")].join("\n");
    const report = await importListoneFromCsv(second, "2026-27");

    expect(report.pruned).toEqual({ deactivated: 1, reactivated: 0 });
    expect(h.table.find((r) => r.name === "Ccc")!.active).toBe(false);

    const third = [line(1, "Aaa", "Inter"), line(3, "Ccc", "Roma")].join("\n");
    const back = await importListoneFromCsv(third, "2026-27");
    expect(back.pruned).toEqual({ deactivated: 1, reactivated: 1 });
    expect(h.table.find((r) => r.name === "Ccc")!.active).toBe(true);
    expect(h.table.find((r) => r.name === "Bbb")!.active).toBe(false);
  });

  it("oltre soglia richiede conferma e non scrive nulla", async () => {
    const many = Array.from({ length: 40 }, (_, i) => line(i + 1, `P${i}`, "Inter")).join("\n");
    await importListoneFromCsv(many, "2026-27");

    const tiny = [line(1, "P0", "Inter")].join("\n");
    await expect(importListoneFromCsv(tiny, "2026-27")).rejects.toThrow(/disattiverebbe/i);
    expect(h.table.every((r) => r.active)).toBe(true);

    const confirmed = await importListoneFromCsv(tiny, "2026-27", true);
    expect(confirmed.pruned!.deactivated).toBe(39);
  });
});

describe("importListoneFromCsv — header CSV (no regression)", () => {
  it("delegates to the header path and writes no quotation", async () => {
    const csv = ["R,Nome,Squadra,Id", "P,Meret,Napoli,200", "D,Di Lorenzo,Napoli,201"].join("\n");
    const report = await importListoneFromCsv(csv, "2026-27");
    expect(report.inserted).toBe(2);
    expect(report.quotation).toBeNull();
    expect(h.quotations).toHaveLength(0);
  });
});
