import type { TeamPrefKind } from "@fanta-helper/shared";
import { pool } from "./client";
import type { UserTeamPrefRow } from "./types";

export async function listTeamPrefs(
  userId: number,
  leagueId: number,
): Promise<UserTeamPrefRow[]> {
  const result = await pool.query<UserTeamPrefRow>(
    "SELECT * FROM user_team_pref WHERE user_id = $1 AND league_id = $2 ORDER BY team",
    [userId, leagueId],
  );
  return result.rows;
}

export async function upsertTeamPref(
  userId: number,
  leagueId: number,
  team: string,
  kind: TeamPrefKind,
): Promise<UserTeamPrefRow> {
  const result = await pool.query<UserTeamPrefRow>(
    `INSERT INTO user_team_pref (user_id, league_id, team, kind)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, league_id, team) DO UPDATE SET kind = EXCLUDED.kind
     RETURNING *`,
    [userId, leagueId, team, kind],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertTeamPref: upsert returned no row");
  }
  return row;
}

export async function deleteTeamPref(
  userId: number,
  leagueId: number,
  team: string,
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM user_team_pref WHERE user_id = $1 AND league_id = $2 AND team = $3",
    [userId, leagueId, team],
  );
  return (result.rowCount ?? 0) > 0;
}
