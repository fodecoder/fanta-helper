import type { PlayerImportReport, QuotationImportReport } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { replaceQuotationsForSeasonTx } from "../db/quotation";
import { ApiError } from "../http/errors";
import { parseXlsxRows, rowsToRecords } from "./fileRows";
import { importPlayersFromRecords, PLAYER_REQUIRED_COLUMNS } from "./playerImport";
import { quotationRowsFromRecords } from "./quotationRows";
import { parseSeasonFromFilename } from "./season";

const QUOTATION_COLUMNS = ["Id", "Qt.A", "Qt.I", "FVM"] as const;

function hasQuotationColumns(record: Record<string, string> | undefined): boolean {
  if (!record) return false;
  return QUOTATION_COLUMNS.every((column) => column in record);
}

// Estende l'import player-only esistente: se il file caricato dal portale
// contiene anche le colonne di quotazione (lo stesso listone Quotazioni_*
// usato per la stagione corrente), scrive in più anche `quotation` per la
// stagione ricavata dal nome file, nella stessa transazione dell'upsert
// player. Nessun matching aggiuntivo: il player_id della riga appena
// upsertata è già certo. `player_season_stats` non ha un trigger da portale
// (solo storico, via seed).
export async function importPlayersAndQuotationsFromXlsx(
  buffer: Buffer,
  filename: string | null,
  confirmed = false,
): Promise<PlayerImportReport> {
  const records = rowsToRecords(parseXlsxRows(buffer), PLAYER_REQUIRED_COLUMNS);
  const quotationCapable = hasQuotationColumns(records[0]);

  let season: string | null = null;
  if (quotationCapable) {
    season = filename !== null ? parseSeasonFromFilename(filename) : null;
    if (season === null) {
      throw ApiError.badRequest(
        "il file contiene colonne di quotazione ma il nome del file non permette di ricavare la stagione (atteso Quotazioni_Fantacalcio_Stagione_AAAA_AA.xlsx)",
      );
    }
  }
  const resolvedSeason = season;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { report, upsertResults } = await importPlayersFromRecords(records, client, {
      prune: { confirmed },
    });

    let quotation: QuotationImportReport | null = null;
    if (quotationCapable && resolvedSeason !== null) {
      const { rows: quotationRows, discarded } = quotationRowsFromRecords(
        records,
        (i) => upsertResults[i]?.row.id,
        resolvedSeason,
      );
      const written = await replaceQuotationsForSeasonTx(client, resolvedSeason, quotationRows);
      quotation = { season: resolvedSeason, written, discarded };
    }

    await client.query("COMMIT");
    return { ...report, quotation };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
