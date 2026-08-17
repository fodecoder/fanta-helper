import { ROLES } from "@fanta-helper/shared";
import type { PlayerImportReport, DiscardedPlayerRow } from "@fanta-helper/shared";
import { upsertPlayer } from "../db/players";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows, parseXlsxRows, rowsToRecords } from "./fileRows";

const REQUIRED_COLUMNS = ["R", "Nome", "Squadra"] as const;

async function importPlayersFromRecords(
  records: Record<string, string>[],
): Promise<PlayerImportReport> {
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  let inserted = 0;
  let updated = 0;
  const discarded: DiscardedPlayerRow[] = [];

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 1;
    const name = cell(record.Nome);
    const team = cell(record.Squadra);
    const ruolo = cell(record.R).toUpperCase();

    if (name === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "nome mancante" });
      continue;
    }
    if (team === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "squadra mancante" });
      continue;
    }
    if (!(ROLES as readonly string[]).includes(ruolo)) {
      discarded.push({
        row: rowNumber,
        name,
        team,
        ruolo,
        reason: `ruolo non valido: '${ruolo}'`,
      });
      continue;
    }

    const { inserted: wasInserted } = await upsertPlayer({
      name,
      team,
      ruolo: ruolo as (typeof ROLES)[number],
    });
    if (wasInserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated, discarded };
}

export async function importPlayersFromCsv(raw: string): Promise<PlayerImportReport> {
  return importPlayersFromRecords(rowsToRecords(parseCsvRows(raw), REQUIRED_COLUMNS));
}

export async function importPlayersFromXlsx(buffer: Buffer): Promise<PlayerImportReport> {
  return importPlayersFromRecords(rowsToRecords(parseXlsxRows(buffer), REQUIRED_COLUMNS));
}
