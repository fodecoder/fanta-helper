import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { ApiError } from "../http/errors";

export function cell(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseCsvRows(raw: string): unknown[][] {
  return parse(raw, {
    delimiter: ";",
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

// Individua la riga di intestazione come la prima che contiene tutte le colonne
// richieste (case-insensitive), poi mappa le righe successive in record. Tollera
// una riga-titolo iniziale, tipica dei listoni ufficiali.
export function rowsToRecords(
  rows: unknown[][],
  requiredColumns: readonly string[],
): Record<string, string>[] {
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map(cell);
    return requiredColumns.every((col) =>
      cells.some((value) => value.toLowerCase() === col.toLowerCase()),
    );
  });
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
