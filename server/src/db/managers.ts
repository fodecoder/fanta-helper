import { pool } from "./client";
import type { ManagerRow } from "./types";

export async function listManagersByLeague(leagueId: number): Promise<ManagerRow[]> {
  const result = await pool.query<ManagerRow>("SELECT * FROM manager WHERE league_id = $1 ORDER BY name", [
    leagueId,
  ]);
  return result.rows;
}

export async function insertManager(input: Omit<ManagerRow, "id">): Promise<ManagerRow> {
  const result = await pool.query<ManagerRow>(
    `INSERT INTO manager (league_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [input.league_id, input.name],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertManager: insert returned no row");
  }
  return row;
}
