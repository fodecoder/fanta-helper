import { pool } from "./client";
import type { GkPairingEntry } from "@fanta-helper/shared";

export async function listGkPairing(): Promise<GkPairingEntry[]> {
  const result = await pool.query<GkPairingEntry>(
    'SELECT team_a AS "teamA", team_b AS "teamB", score FROM gk_pairing ORDER BY team_a, team_b',
  );
  return result.rows;
}

// L'import è uno snapshot: sostituisce interamente la matrice in una
// transazione, così una nuova versione del file non lascia righe stantie.
export async function replaceGkPairing(entries: GkPairingEntry[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE gk_pairing RESTART IDENTITY");
    for (const entry of entries) {
      await client.query(
        "INSERT INTO gk_pairing (team_a, team_b, score) VALUES ($1, $2, $3)",
        [entry.teamA, entry.teamB, entry.score],
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
