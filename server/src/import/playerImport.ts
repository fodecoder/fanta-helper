import { ROLES } from "@fanta-helper/shared";
import type { PlayerImportReport, DiscardedPlayerRow } from "@fanta-helper/shared";
import type { Queryable } from "../db/client";
import { upsertPlayer } from "../db/players";
import type { PlayerUpsertResult } from "../db/players";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows, parseXlsxRows, rowsToRecords } from "./fileRows";
import { parseNullableInt } from "./numeric";

export const PLAYER_REQUIRED_COLUMNS = ["R", "Nome", "Squadra"] as const;

export interface PlayerRecordImportOutcome {
  report: PlayerImportReport;
  // Per-row upsert result, aligned by index with `records` (undefined for a
  // discarded row) — lets callers that also need quotation data reuse the
  // same upsert pass instead of re-validating/re-matching from scratch.
  upsertResults: (PlayerUpsertResult | undefined)[];
}

// executor lets a caller (e.g. the combined player+quotation portal import)
// run this inside its own open transaction instead of each upsert opening
// one implicitly on the shared pool.
export async function importPlayersFromRecords(
  records: Record<string, string>[],
  executor?: Queryable,
): Promise<PlayerRecordImportOutcome> {
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  let inserted = 0;
  let updated = 0;
  const discarded: DiscardedPlayerRow[] = [];
  const upsertResults: (PlayerUpsertResult | undefined)[] = [];

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 1;
    const name = cell(record.Nome);
    const team = cell(record.Squadra);
    const ruolo = cell(record.R).toUpperCase();

    if (name === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "nome mancante" });
      upsertResults.push(undefined);
      continue;
    }
    if (team === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "squadra mancante" });
      upsertResults.push(undefined);
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
      upsertResults.push(undefined);
      continue;
    }

    // Id è opportunisticamente disponibile su qualunque listone (anche il
    // player-only import legge lo stesso file quotazioni): se presente e
    // numerico, viene registrato subito come fanta_id, senza richiederlo né
    // scartare la riga se assente/non numerico.
    const idCell = record.Id;
    const parsedFantaId = idCell !== undefined ? parseNullableInt(cell(idCell)) : { ok: true as const, value: null };
    const fantaId = parsedFantaId.ok ? parsedFantaId.value : null;

    const result = await upsertPlayer(
      { name, team, ruolo: ruolo as (typeof ROLES)[number], fanta_id: fantaId },
      executor,
    );
    upsertResults.push(result);
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { report: { inserted, updated, discarded, quotation: null }, upsertResults };
}

export async function importPlayersFromCsv(raw: string): Promise<PlayerImportReport> {
  const { report } = await importPlayersFromRecords(rowsToRecords(parseCsvRows(raw), PLAYER_REQUIRED_COLUMNS));
  return report;
}

export async function importPlayersFromXlsx(buffer: Buffer): Promise<PlayerImportReport> {
  const { report } = await importPlayersFromRecords(
    rowsToRecords(parseXlsxRows(buffer), PLAYER_REQUIRED_COLUMNS),
  );
  return report;
}
