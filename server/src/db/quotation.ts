import { pool } from "./client";
import type { Queryable } from "./client";
import type { QuotationRow } from "./types";

// Sostituzione per stagione in transazione: mai upsert riga-per-riga, così
// un reimport riflette esattamente l'ultimo file per quella stagione. Stesso
// spirito di replaceSetPieceTakersForTeam, ma chiavato per season.
// Chunk da 200 righe (1000 parametri): un import listone completo scrive
// ~600 quotazioni e non deve fare un round-trip per riga (rischio 524
// gateway timeout quando la richiesta passa dal proxy edge).
const QUOTATION_BATCH_ROWS = 200;

export async function replaceQuotationsForSeasonTx(
  client: Queryable,
  season: string,
  rows: QuotationRow[],
): Promise<number> {
  await client.query("DELETE FROM quotation WHERE season = $1", [season]);
  for (let i = 0; i < rows.length; i += QUOTATION_BATCH_ROWS) {
    const batch = rows.slice(i, i + QUOTATION_BATCH_ROWS);
    const params: unknown[] = [];
    const tuples = batch.map((row, j) => {
      const b = j * 5;
      params.push(row.player_id, season, row.qt_i, row.qt_a, row.fvm);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
    });
    await client.query(
      `INSERT INTO quotation (player_id, season, qt_i, qt_a, fvm) VALUES ${tuples.join(", ")}`,
      params,
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

// Stagioni in formato "AAAA-AA" ordinano correttamente come stringa: MAX()
// individua quella più recente senza dover parsare l'anno.
export async function getLatestQuotationSeason(): Promise<string | null> {
  const result = await pool.query<{ season: string | null }>(
    "SELECT MAX(season) AS season FROM quotation",
  );
  return result.rows[0]?.season ?? null;
}
