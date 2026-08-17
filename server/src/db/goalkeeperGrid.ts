import { pool } from "./client";
import type { GoalkeeperGridEntry } from "@fanta-helper/shared";

export async function listGoalkeeperGrid(): Promise<GoalkeeperGridEntry[]> {
  const result = await pool.query<GoalkeeperGridEntry>(
    "SELECT team, rank, name FROM goalkeeper_grid ORDER BY team, rank",
  );
  return result.rows;
}

// L'import è uno snapshot: sostituisce interamente la griglia in una
// transazione, così una nuova versione del file non lascia righe stantie.
export async function replaceGoalkeeperGrid(entries: GoalkeeperGridEntry[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE goalkeeper_grid RESTART IDENTITY");
    for (const entry of entries) {
      await client.query(
        "INSERT INTO goalkeeper_grid (team, rank, name) VALUES ($1, $2, $3)",
        [entry.team, entry.rank, entry.name],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
