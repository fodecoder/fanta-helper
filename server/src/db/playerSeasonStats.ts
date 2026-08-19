import { pool } from "./client";
import type { Queryable } from "./client";
import type { PlayerSeasonStatsRow } from "./types";

export async function replacePlayerSeasonStatsForSeasonTx(
  client: Queryable,
  season: string,
  rows: PlayerSeasonStatsRow[],
): Promise<number> {
  await client.query("DELETE FROM player_season_stats WHERE season = $1", [season]);
  for (const row of rows) {
    await client.query(
      `INSERT INTO player_season_stats
        (player_id, season, presenze, mv, fm, gf, gs, assist, rp, rc, rig_plus, rig_minus, amm, esp, autogol)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        row.player_id,
        season,
        row.presenze,
        row.mv,
        row.fm,
        row.gf,
        row.gs,
        row.assist,
        row.rp,
        row.rc,
        row.rig_plus,
        row.rig_minus,
        row.amm,
        row.esp,
        row.autogol,
      ],
    );
  }
  return rows.length;
}

export async function replacePlayerSeasonStatsForSeason(
  season: string,
  rows: PlayerSeasonStatsRow[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const written = await replacePlayerSeasonStatsForSeasonTx(client, season, rows);
    await client.query("COMMIT");
    return written;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listPlayerSeasonStatsBySeason(
  season: string,
): Promise<PlayerSeasonStatsRow[]> {
  const result = await pool.query<PlayerSeasonStatsRow>(
    "SELECT * FROM player_season_stats WHERE season = $1",
    [season],
  );
  return result.rows;
}

// Stagioni in formato "AAAA-AA" ordinano correttamente come stringa: MAX()
// individua quella più recente senza dover parsare l'anno. Le statistiche
// esistono solo per stagioni concluse, quindi tipicamente precede la
// stagione più recente in `quotation` (che include anche quella corrente).
export async function getLatestStatsSeason(): Promise<string | null> {
  const result = await pool.query<{ season: string | null }>(
    "SELECT MAX(season) AS season FROM player_season_stats",
  );
  return result.rows[0]?.season ?? null;
}
