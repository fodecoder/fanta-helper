import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { ApiError } from "../http/errors";

export function cell(value: unknown): string {
  return String(value ?? "").trim();
}

// Sniff del separatore sulla prima riga non vuota: i CSV derivati dagli xlsx
// ufficiali usano `;`, mentre l'export "Lista FantaAsta" usa `,` (e mette `;`
// *dentro* i campi, es. nazionalità "Albania;Svizzera"). Conta le occorrenze
// fuori dalle virgolette e sceglie il separatore più frequente; a parità
// resta `;` per retrocompatibilità.
function sniffDelimiter(raw: string): "," | ";" {
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  let comma = 0;
  let semicolon = 0;
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ",") comma += 1;
    else if (!inQuotes && ch === ";") semicolon += 1;
  }
  return comma > semicolon ? "," : ";";
}

export function parseCsvRows(raw: string, delimiter?: string): unknown[][] {
  return parse(raw, {
    delimiter: delimiter ?? sniffDelimiter(raw),
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as unknown[][];
}

export function parseXlsxRows(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    throw ApiError.badRequest("xlsx file has no sheets");
  }
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
}

// Indice (0-based) della prima riga che contiene tutte le colonne richieste
// (case-insensitive). Tollera una riga-titolo iniziale, tipica dei listoni
// ufficiali. -1 se nessuna riga è un'intestazione valida (es. listone
// posizionale senza header).
export function findHeaderRow(rows: unknown[][], requiredColumns: readonly string[]): number {
  return rows.findIndex((row) => {
    const cells = row.map(cell);
    return requiredColumns.every((col) =>
      cells.some((value) => value.toLowerCase() === col.toLowerCase()),
    );
  });
}

export function rowsToRecords(
  rows: unknown[][],
  requiredColumns: readonly string[],
): Record<string, string>[] {
  const headerIndex = findHeaderRow(rows, requiredColumns);
  if (headerIndex === -1) {
    throw ApiError.badRequest(`file is missing required columns: ${requiredColumns.join(", ")}`);
  }

  const header = rows[headerIndex]!.map(cell);
  const records: Record<string, string>[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (row.every((value) => cell(value) === "")) continue;
    const record: Record<string, string> = {};
    header.forEach((key, column) => {
      if (key !== "") record[key] = cell(row[column]);
    });
    records.push(record);
  }
  return records;
}

// Mappa colonna-per-indice del listone "Lista FantaAsta" di Fantacalcio.it
// (nessuna doc ufficiale pubblica: ricostruita dal file
// `Lista-FantaAsta-Fantacalcio.csv`, 19 colonne, nessun header). Riga esempio:
//   4431,Carnesecchi,Marco Carnesecchi,P,Por,16,16,16,16,Atalanta,52,52,
//   destro,Italia,01/07/2000 00:00:00,https://...4431.png?v=765,0,6.5,6.5
// Le chiavi prodotte coincidono con quelle del path a header (`Id`, `Nome`,
// `Squadra`, `R`, `Qt.I`, `Qt.A`, `FVM`) così il codice a valle è condiviso;
// `Nome completo` e `image_url` sono aggiuntive. Colonne non mappate (ruolo
// Mantra, FVM Mantra, piede, nazionalità, data nascita, flag, Mv, Fm) sono
// ignorate: le statistiche si importano solo dal seed storico.
export const LISTONE_COLUMN_INDEX: Record<string, number> = {
  Id: 0,
  Nome: 1,
  "Nome completo": 2,
  R: 3,
  // Colonne 5–8 sono quotazioni identiche a inizio stagione: Qt.I ← 5,
  // Qt.A ← 6. La coppia esatta è a basso rischio finché sono uguali.
  "Qt.I": 5,
  "Qt.A": 6,
  Squadra: 9,
  FVM: 10,
  image_url: 15,
};

// Converte righe posizionali in record con le stesse chiavi del path a header.
// Una cella mancante o vuota → chiave omessa (non stringa vuota): a valle il
// campo resta "non fornito" e la riga non viene scartata in blocco per una
// singola colonna assente. Le righe realmente invalide (Nome/Ruolo/Squadra
// mancanti) non vengono filtrate qui: finiscono nel report di scarto a valle
// con il loro motivo.
export function rowsFromPositional(
  rows: unknown[][],
  indexMap: Record<string, number>,
): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  for (const row of rows) {
    if (row.every((value) => cell(value) === "")) continue;
    const record: Record<string, string> = {};
    for (const [key, column] of Object.entries(indexMap)) {
      const value = cell(row[column]);
      if (value !== "") record[key] = value;
    }
    records.push(record);
  }
  return records;
}
