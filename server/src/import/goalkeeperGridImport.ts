import type {
  GoalkeeperGridEntry,
  GoalkeeperGridImportReport,
  DiscardedGridRow,
} from "@fanta-helper/shared";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows, parseXlsxRows, rowsToRecords } from "./fileRows";

const REQUIRED_COLUMNS = ["Squadra"] as const;

// Formato "largo": una riga per squadra, una colonna per livello di gerarchia.
// Le intestazioni note vengono mappate al `rank` (1 = titolare). Sono ammesse
// anche colonne numerate tipo "Portiere 2" / "P3".
function rankForHeader(header: string): number | null {
  const key = header.toLowerCase().replace(/\.+$/, "").trim();
  if (["titolare", "portiere", "primo", "p1", "gk1"].includes(key)) return 1;
  if (["riserva", "secondo", "p2", "gk2"].includes(key)) return 2;
  if (["terzo", "p3", "gk3"].includes(key)) return 3;
  const match = key.match(/^(?:portiere|riserva|p|gk)\s*(\d+)$/);
  return match ? Number(match[1]) : null;
}

function toEntries(records: Record<string, string>[]): GoalkeeperGridImportReport & {
  rows: GoalkeeperGridEntry[];
} {
  const rankByHeader = new Map<string, number>();
  for (const header of Object.keys(records[0] ?? {})) {
    const rank = rankForHeader(header);
    if (rank !== null) rankByHeader.set(header, rank);
  }
  if (rankByHeader.size === 0) {
    throw ApiError.badRequest(
      "file is missing goalkeeper columns (es. Titolare, Riserva, Terzo)",
    );
  }

  const rows: GoalkeeperGridEntry[] = [];
  const discarded: DiscardedGridRow[] = [];
  const teams = new Set<string>();

  records.forEach((record, index) => {
    const rowNumber = index + 1;
    const team = cell(record.Squadra);
    if (team === "") {
      discarded.push({ row: rowNumber, team, reason: "squadra mancante" });
      return;
    }

    const seenRanks = new Set<number>();
    let added = 0;
    for (const [header, rank] of rankByHeader) {
      const name = cell(record[header]);
      if (name === "" || seenRanks.has(rank)) continue;
      seenRanks.add(rank);
      rows.push({ team, rank, name });
      added += 1;
    }

    if (added === 0) {
      discarded.push({ row: rowNumber, team, reason: "nessun portiere indicato" });
      return;
    }
    teams.add(team);
  });

  return { teams: teams.size, entries: rows.length, discarded, rows };
}

export function parseGoalkeeperGrid(records: Record<string, string>[]): {
  report: GoalkeeperGridImportReport;
  entries: GoalkeeperGridEntry[];
} {
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }
  const { rows, ...report } = toEntries(records);
  return { report, entries: rows };
}

export function goalkeeperGridFromCsv(raw: string) {
  return parseGoalkeeperGrid(rowsToRecords(parseCsvRows(raw), REQUIRED_COLUMNS));
}

export function goalkeeperGridFromXlsx(buffer: Buffer) {
  return parseGoalkeeperGrid(rowsToRecords(parseXlsxRows(buffer), REQUIRED_COLUMNS));
}
