import type {
  GkPairingEntry,
  GkPairingImportReport,
  DiscardedGkPairingRow,
} from "@fanta-helper/shared";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows, parseXlsxRows } from "./fileRows";

// L'intestazione (righe/colonne = sigle squadra) è la prima riga con almeno
// due celle non vuote dopo la prima colonna: distingue l'intestazione da
// un'eventuale riga-titolo iniziale (che ha al più una cella valorizzata).
function findHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex(
    (row) => row.slice(1).map(cell).filter((value) => value !== "").length >= 2,
  );
}

function parseScore(raw: string): number | null {
  if (!/^-?\d+$/.test(raw)) return null;
  const score = Number(raw);
  return score >= 0 ? score : null;
}

// Formato "matrice": intestazione riga/colonna = sigle squadra, celle =
// punteggio, diagonale vuota. Le righe il cui primo campo non corrisponde a
// nessuna sigla di intestazione (legende finali, righe malformate) vengono
// scartate e riportate, mai interpretate come dato.
function parseMatrix(rows: unknown[][]): GkPairingImportReport & { rows: GkPairingEntry[] } {
  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    throw ApiError.badRequest("file has no team columns");
  }

  const headerRow = rows[headerRowIndex]!.map(cell);
  const columnTeams = headerRow.slice(1);
  const teamBySigla = new Map<string, string>();
  for (const team of columnTeams) {
    if (team !== "") teamBySigla.set(team.toLowerCase(), team);
  }

  const pairScores = new Map<string, GkPairingEntry>();
  const discarded: DiscardedGkPairingRow[] = [];
  const seenRowTeams = new Set<string>();

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (row.every((value) => cell(value) === "")) continue;

    const rowNumber = i + 1;
    const rawLabel = cell(row[0]);
    const rowTeam = teamBySigla.get(rawLabel.toLowerCase());
    if (rowTeam === undefined) {
      discarded.push({
        row: rowNumber,
        label: rawLabel === "" ? "(vuota)" : rawLabel,
        reason: "riga non riconosciuta (squadra non in intestazione)",
      });
      continue;
    }
    if (seenRowTeams.has(rowTeam)) {
      discarded.push({ row: rowNumber, label: rowTeam, reason: "squadra duplicata" });
      continue;
    }
    seenRowTeams.add(rowTeam);

    columnTeams.forEach((rawColTeam, columnIndex) => {
      if (rawColTeam === "") return;
      const colTeam = teamBySigla.get(rawColTeam.toLowerCase())!;
      if (colTeam === rowTeam) return;

      const raw = cell(row[columnIndex + 1]);
      if (raw === "") return;

      const label = `${rowTeam}-${colTeam}`;
      const score = parseScore(raw);
      if (score === null) {
        discarded.push({ row: rowNumber, label, reason: "punteggio non valido" });
        return;
      }

      const teamA = rowTeam < colTeam ? rowTeam : colTeam;
      const teamB = rowTeam < colTeam ? colTeam : rowTeam;
      const key = `${teamA}|${teamB}`;
      const existing = pairScores.get(key);
      if (existing && existing.score !== score) {
        discarded.push({
          row: rowNumber,
          label,
          reason: `punteggio incoerente con la cella speculare (${existing.score} vs ${score})`,
        });
        return;
      }
      pairScores.set(key, { teamA, teamB, score });
    });
  }

  const entries = [...pairScores.values()];
  return { teams: seenRowTeams.size, pairs: entries.length, discarded, rows: entries };
}

export function parseGkPairing(rows: unknown[][]): {
  report: GkPairingImportReport;
  entries: GkPairingEntry[];
} {
  if (rows.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }
  const { rows: entries, ...report } = parseMatrix(rows);
  return { report, entries };
}

export function gkPairingFromCsv(raw: string) {
  return parseGkPairing(parseCsvRows(raw));
}

export function gkPairingFromXlsx(buffer: Buffer) {
  return parseGkPairing(parseXlsxRows(buffer));
}
