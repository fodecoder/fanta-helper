import { pool } from "./client";
import type { LeagueRow } from "./types";

export async function listLeagues(): Promise<LeagueRow[]> {
  const result = await pool.query<LeagueRow>("SELECT * FROM league ORDER BY name");
  return result.rows;
}

export async function getLeagueById(id: number): Promise<LeagueRow | undefined> {
  const result = await pool.query<LeagueRow>("SELECT * FROM league WHERE id = $1", [id]);
  return result.rows[0];
}

export async function getLeagueByName(name: string): Promise<LeagueRow | undefined> {
  const result = await pool.query<LeagueRow>("SELECT * FROM league WHERE name = $1", [name]);
  return result.rows[0];
}

export async function insertLeague(input: Omit<LeagueRow, "id">): Promise<LeagueRow> {
  const result = await pool.query<LeagueRow>(
    `INSERT INTO league (name, n_squadre, budget, roster_config, scoring, modificatori, budget_target_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.n_squadre,
      input.budget,
      input.roster_config,
      input.scoring,
      input.modificatori,
      input.budget_target_by_role,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertLeague: insert returned no row");
  }
  return row;
}

export async function updateLeague(
  id: number,
  input: Omit<LeagueRow, "id">,
): Promise<LeagueRow | undefined> {
  const result = await pool.query<LeagueRow>(
    `UPDATE league
     SET name = $2, n_squadre = $3, budget = $4, roster_config = $5, scoring = $6, modificatori = $7,
         budget_target_by_role = $8
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name,
      input.n_squadre,
      input.budget,
      input.roster_config,
      input.scoring,
      input.modificatori,
      input.budget_target_by_role,
    ],
  );
  return result.rows[0];
}

export async function deleteLeague(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM league WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
