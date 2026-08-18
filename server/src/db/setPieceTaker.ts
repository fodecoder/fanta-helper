import { pool } from "./client";
import type { SetPieceTakerEntry, SetPieceTakerConfirmEntry } from "@fanta-helper/shared";

export async function listSetPieceTakers(): Promise<SetPieceTakerEntry[]> {
  const result = await pool.query<SetPieceTakerEntry>(
    "SELECT team, tipo, player_name, rank FROM set_piece_taker ORDER BY team, tipo, rank",
  );
  return result.rows;
}

// Ingest per-squadra, come replaceProbableLineupForTeam: ogni screenshot
// riguarda una sola squadra, un TRUNCATE globale azzererebbe le altre
// squadre già confermate ad ogni singola conferma.
export async function replaceSetPieceTakersForTeam(
  team: string,
  entries: SetPieceTakerConfirmEntry[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM set_piece_taker WHERE team = $1", [team]);
    for (const entry of entries) {
      await client.query(
        "INSERT INTO set_piece_taker (team, tipo, player_name, rank) VALUES ($1, $2, $3, $4)",
        [team, entry.tipo, entry.player_name, entry.rank],
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

export interface SetPieceTakerScreenshotRow {
  image: Buffer;
  content_type: string;
  uploaded_at: Date;
}

export async function upsertSetPieceTakerScreenshot(
  team: string,
  image: Buffer,
  contentType: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO set_piece_taker_screenshot (team, image, content_type, uploaded_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (team) DO UPDATE
       SET image = EXCLUDED.image, content_type = EXCLUDED.content_type, uploaded_at = now()`,
    [team, image, contentType],
  );
}

export async function getSetPieceTakerScreenshot(
  team: string,
): Promise<SetPieceTakerScreenshotRow | undefined> {
  const result = await pool.query<SetPieceTakerScreenshotRow>(
    "SELECT image, content_type, uploaded_at FROM set_piece_taker_screenshot WHERE team = $1",
    [team],
  );
  return result.rows[0];
}
