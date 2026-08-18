import { pool } from "./client";
import type { ProbableLineupEntry, ProbableLineupConfirmEntry } from "@fanta-helper/shared";

export async function listProbableLineup(): Promise<ProbableLineupEntry[]> {
  const result = await pool.query<ProbableLineupEntry>(
    "SELECT team, player_name, ruolo, stato FROM probable_lineup ORDER BY team, player_name",
  );
  return result.rows;
}

// A differenza di replaceGkPairing (TRUNCATE dell'intera tabella),
// l'ingest qui è per-squadra: ogni screenshot riguarda una sola squadra,
// caricata indipendentemente dalle altre nel tempo. Un TRUNCATE globale
// azzererebbe le altre squadre già confermate ad ogni singola conferma.
export async function replaceProbableLineupForTeam(
  team: string,
  entries: ProbableLineupConfirmEntry[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM probable_lineup WHERE team = $1", [team]);
    for (const entry of entries) {
      await client.query(
        "INSERT INTO probable_lineup (team, player_name, ruolo, stato) VALUES ($1, $2, $3, $4)",
        [team, entry.player_name, entry.ruolo, entry.stato],
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

export interface ProbableLineupScreenshotRow {
  image: Buffer;
  content_type: string;
  uploaded_at: Date;
}

export async function upsertProbableLineupScreenshot(
  team: string,
  image: Buffer,
  contentType: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO probable_lineup_screenshot (team, image, content_type, uploaded_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (team) DO UPDATE
       SET image = EXCLUDED.image, content_type = EXCLUDED.content_type, uploaded_at = now()`,
    [team, image, contentType],
  );
}

export async function getProbableLineupScreenshot(
  team: string,
): Promise<ProbableLineupScreenshotRow | undefined> {
  const result = await pool.query<ProbableLineupScreenshotRow>(
    "SELECT image, content_type, uploaded_at FROM probable_lineup_screenshot WHERE team = $1",
    [team],
  );
  return result.rows[0];
}
