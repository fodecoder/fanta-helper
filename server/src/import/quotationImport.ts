import type { QuotationImportReport, QuotationRow, DiscardedReferenceRow } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { listPlayers, backfillPlayerFantaId } from "../db/players";
import { replaceQuotationsForSeasonTx } from "../db/quotation";
import { ApiError } from "../http/errors";
import { cell, parseXlsxRows, rowsToRecords } from "./fileRows";
import { buildPlayerIndex, matchPlayerRow } from "./referenceMatch";
import { parseNullableInt } from "./numeric";

const REQUIRED_COLUMNS = ["Id", "Nome", "Squadra", "Qt.A", "Qt.I", "FVM"] as const;

// Import storico/corrente delle quotazioni: fanta_id-first, fallback
// name+team, mai inventato; sostituzione completa della stagione in
// transazione. Riusato sia dal seed storico sia (indirettamente, via lo
// stesso pattern) dal path portale per la stagione corrente.
export async function importQuotationsFromXlsx(
  buffer: Buffer,
  season: string,
): Promise<QuotationImportReport> {
  const records = rowsToRecords(parseXlsxRows(buffer), REQUIRED_COLUMNS);
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const index = buildPlayerIndex(await listPlayers());
  const rows: QuotationRow[] = [];
  const discarded: DiscardedReferenceRow[] = [];
  const backfills: { player_id: number; fanta_id: number }[] = [];
  const claimedFantaIds = new Set(index.byFantaId.keys());

  records.forEach((record, i) => {
    const rowNumber = i + 1;
    const fantaIdRaw = cell(record.Id);
    const name = cell(record.Nome);
    const team = cell(record.Squadra);

    const match = matchPlayerRow(index, fantaIdRaw, name, team);
    if (match.status === "discarded") {
      discarded.push({ row: rowNumber, fanta_id: fantaIdRaw || null, name, team, reason: match.reason });
      return;
    }

    const qtI = parseNullableInt(cell(record["Qt.I"]));
    const qtA = parseNullableInt(cell(record["Qt.A"]));
    const fvm = parseNullableInt(cell(record.FVM));
    if (!qtI.ok || !qtA.ok || !fvm.ok) {
      discarded.push({
        row: rowNumber,
        fanta_id: fantaIdRaw || null,
        name,
        team,
        reason: "valore non numerico in Qt.I/Qt.A/FVM",
      });
      return;
    }

    rows.push({ player_id: match.player.id, season, qt_i: qtI.value, qt_a: qtA.value, fvm: fvm.value });

    // Backfill fanta_id solo per chi è stato matchato via name+team, non lo
    // aveva già, e il file-Id non è già rivendicato da un altro giocatore in
    // questo stesso import (una collisione qui segnala un file malformato,
    // meglio lasciare fanta_id assente che inventare un'associazione).
    if (
      match.matchedBy === "name_team" &&
      match.fantaIdFromFile !== null &&
      match.player.fanta_id === null &&
      !claimedFantaIds.has(match.fantaIdFromFile)
    ) {
      backfills.push({ player_id: match.player.id, fanta_id: match.fantaIdFromFile });
      claimedFantaIds.add(match.fantaIdFromFile);
    }
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const backfill of backfills) {
      await backfillPlayerFantaId(backfill.player_id, backfill.fanta_id, client);
    }
    const written = await replaceQuotationsForSeasonTx(client, season, rows);
    await client.query("COMMIT");
    return { season, written, discarded };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
