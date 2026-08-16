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

export async function getManagerById(id: number, leagueId: number): Promise<ManagerRow | undefined> {
  const result = await pool.query<ManagerRow>(
    "SELECT * FROM manager WHERE id = $1 AND league_id = $2",
    [id, leagueId],
  );
  return result.rows[0];
}

export async function updateManager(
  id: number,
  leagueId: number,
  input: Omit<ManagerRow, "id" | "league_id">,
): Promise<ManagerRow | undefined> {
  const result = await pool.query<ManagerRow>(
    `UPDATE manager
     SET name = $3
     WHERE id = $1 AND league_id = $2
     RETURNING *`,
    [id, leagueId, input.name],
  );
  return result.rows[0];
}

export async function deleteManager(id: number, leagueId: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM manager WHERE id = $1 AND league_id = $2", [id, leagueId]);
  return (result.rowCount ?? 0) > 0;
}
