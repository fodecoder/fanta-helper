import { pool } from "./client";
import type { Queryable } from "./client";
import type { QuotationRow } from "./types";

// Sostituzione per stagione in transazione: mai upsert riga-per-riga, così
// un reimport riflette esattamente l'ultimo file per quella stagione. Stesso
// spirito di replaceSetPieceTakersForTeam, ma chiavato per season.
export async function replaceQuotationsForSeasonTx(
  client: Queryable,
  season: string,
  rows: QuotationRow[],
): Promise<number> {
  await client.query("DELETE FROM quotation WHERE season = $1", [season]);
  for (const row of rows) {
    await client.query(
      `INSERT INTO quotation (player_id, season, qt_i, qt_a, fvm) VALUES ($1, $2, $3, $4, $5)`,
      [row.player_id, season, row.qt_i, row.qt_a, row.fvm],
    );
  }
  return rows.length;
}

// Variante che apre/chiude la propria transazione, per chi (es. lo script di
// seed storico) non ne ha già una aperta.
export async function replaceQuotationsForSeason(
  season: string,
  rows: QuotationRow[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const written = await replaceQuotationsForSeasonTx(client, season, rows);
    await client.query("COMMIT");
    return written;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listQuotationsBySeason(season: string): Promise<QuotationRow[]> {
  const result = await pool.query<QuotationRow>("SELECT * FROM quotation WHERE season = $1", [
    season,
  ]);
  return result.rows;
}
