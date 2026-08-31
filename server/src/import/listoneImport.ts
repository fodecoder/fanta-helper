import type { PlayerImportReport } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { replaceQuotationsForSeasonTx } from "../db/quotation";
import { ApiError } from "../http/errors";
import {
  findHeaderRow,
  parseCsvRows,
  rowsFromPositional,
  LISTONE_COLUMN_INDEX,
} from "./fileRows";
import { importPlayersFromCsv, importPlayersFromRecords, PLAYER_REQUIRED_COLUMNS } from "./playerImport";
import { quotationRowsFromRecords } from "./quotationRows";

// Import del listone. Due formati sullo stesso endpoint:
//  - file CSV con riga di header nominata (R/Nome/Squadra, come i vecchi
//    export xlsx→csv): delega al path esistente, invariato;
//  - export "Lista FantaAsta" posizionale senza header: mappatura per indice
//    (LISTONE_COLUMN_INDEX), scrive anagrafica + quotazioni della stagione
//    nella stessa transazione. La stagione non è ricavabile dal contenuto né
//    dal nome file standard: arriva dal form di import (header X-Season).
export async function importListoneFromCsv(
  raw: string,
  season: string | null,
): Promise<PlayerImportReport> {
  const rows = parseCsvRows(raw);

  if (findHeaderRow(rows, PLAYER_REQUIRED_COLUMNS) !== -1) {
    return importPlayersFromCsv(raw);
  }

  if (season === null || season.trim() === "") {
    throw ApiError.badRequest(
      "il listone posizionale richiede la stagione (campo Stagione nel form di import)",
    );
  }
  const resolvedSeason = season.trim();

  const records = rowsFromPositional(rows, LISTONE_COLUMN_INDEX);
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { report, upsertResults } = await importPlayersFromRecords(records, client);

    const { rows: quotationRows, discarded } = quotationRowsFromRecords(
      records,
      (i) => upsertResults[i]?.row.id,
      resolvedSeason,
    );
    const written = await replaceQuotationsForSeasonTx(client, resolvedSeason, quotationRows);

    await client.query("COMMIT");
    return { ...report, quotation: { season: resolvedSeason, written, discarded } };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
