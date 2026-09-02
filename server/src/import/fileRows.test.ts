import { describe, it, expect } from "vitest";
import { parseCsvRows, findHeaderRow, rowsFromPositional, LISTONE_COLUMN_INDEX } from "./fileRows";

describe("parseCsvRows", () => {
  it("sniffs comma as delimiter when the file is comma-separated", () => {
    const rows = parseCsvRows("4431,Carnesecchi,P,Atalanta\n2297,Rossi F.,P,Atalanta");
    expect(rows[0]).toEqual(["4431", "Carnesecchi", "P", "Atalanta"]);
  });

  it("keeps semicolon for xlsx-derived files (semicolon inside a field is not a split)", () => {
    const rows = parseCsvRows("Id;Nome;Nazione\n1;Ahanor;Italia,Nigeria");
    expect(rows[1]).toEqual(["1", "Ahanor", "Italia,Nigeria"]);
  });

  it("honours an explicit delimiter override", () => {
    const rows = parseCsvRows("a,b;c,d", ";");
    expect(rows[0]).toEqual(["a,b", "c,d"]);
  });

  it("reads quotes inside an unquoted field without throwing (nicknames in Nome completo)", () => {
    const csv = ["1,Rossi,Mario \"Er\" Rossi,C,Inter", "2,Bianchi,Luca Bianchi,D,Como"].join("\n");
    expect(() => parseCsvRows(csv)).not.toThrow();
    const rows = parseCsvRows(csv);
    expect(rows[0]![2]).toBe('Mario "Er" Rossi');
    expect(rows).toHaveLength(2);
  });

  it("still sniffs comma when the first line carries an internal quote", () => {
    const rows = parseCsvRows('1,Goncalves P.,Goncalves "Pote" Pedro,C,Fiorentina\n2,Tizio,Tizio Uno,D,Inter');
    expect(rows[0]).toEqual(["1", "Goncalves P.", 'Goncalves "Pote" Pedro', "C", "Fiorentina"]);
  });
});

describe("findHeaderRow", () => {
  it("returns -1 for a positional file with no header", () => {
    const rows = parseCsvRows("4431,Carnesecchi,Marco Carnesecchi,P,Por,16,16,16,16,Atalanta");
    expect(findHeaderRow(rows, ["R", "Nome", "Squadra"])).toBe(-1);
  });

  it("finds the header row past a leading title row", () => {
    const rows = [
      ["Listone ufficiale"],
      ["Id", "R", "Nome", "Squadra"],
      ["1", "P", "Tizio", "Inter"],
    ];
    expect(findHeaderRow(rows, ["R", "Nome", "Squadra"])).toBe(1);
  });
});

describe("rowsFromPositional", () => {
  it("maps by index and omits empty cells (no blanket discard)", () => {
    const rows = parseCsvRows(
      "4431,Carnesecchi,Marco Carnesecchi,P,Por,16,16,16,16,Atalanta,52,52,destro,Italia,01/07/2000,https://img/4431.png,0,6.5,6.5",
    );
    const record = rowsFromPositional(rows, LISTONE_COLUMN_INDEX)[0]!;
    expect(record).toMatchObject({
      Id: "4431",
      Nome: "Carnesecchi",
      "Nome completo": "Marco Carnesecchi",
      R: "P",
      Squadra: "Atalanta",
      "Qt.I": "16",
      "Qt.A": "16",
      FVM: "52",
      image_url: "https://img/4431.png",
    });
  });

  it("omits a key when its cell is missing entirely", () => {
    const rows = [["4431", "Carnesecchi", "", "P", "", "", "", "", "", "Atalanta"]];
    const record = rowsFromPositional(rows, LISTONE_COLUMN_INDEX)[0]!;
    expect(record).not.toHaveProperty("Nome completo");
    expect(record).not.toHaveProperty("image_url");
    expect(record.Squadra).toBe("Atalanta");
  });
});
