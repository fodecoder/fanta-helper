import { pool } from "./client";
import type { UserPlayerTrapTagRow } from "./types";

export async function listPlayerTrapTags(userId: number, leagueId: number): Promise<number[]> {
  const result = await pool.query<UserPlayerTrapTagRow>(
    "SELECT player_id FROM user_player_trap_tag WHERE user_id = $1 AND league_id = $2 ORDER BY player_id",
    [userId, leagueId],
  );
  return result.rows.map((r) => r.player_id);
}

export async function addPlayerTrapTag(
  userId: number,
  leagueId: number,
  playerId: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_player_trap_tag (user_id, league_id, player_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, league_id, player_id) DO NOTHING`,
    [userId, leagueId, playerId],
  );
}

export async function deletePlayerTrapTag(
  userId: number,
  leagueId: number,
  playerId: number,
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM user_player_trap_tag WHERE user_id = $1 AND league_id = $2 AND player_id = $3",
    [userId, leagueId, playerId],
  );
  return (result.rowCount ?? 0) > 0;
}
