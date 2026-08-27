import { pool } from "./client";
import type { AppUserRow } from "./types";

export async function getUserByUsername(username: string): Promise<AppUserRow | undefined> {
  const result = await pool.query<AppUserRow>("SELECT * FROM app_user WHERE username = $1", [username]);
  return result.rows[0];
}

export async function getUserById(id: number): Promise<AppUserRow | undefined> {
  const result = await pool.query<AppUserRow>("SELECT * FROM app_user WHERE id = $1", [id]);
  return result.rows[0];
}

export async function upsertUser(input: Omit<AppUserRow, "id">): Promise<AppUserRow> {
  const result = await pool.query<AppUserRow>(
    `INSERT INTO app_user (username, password_hash, avatar, avatar_color)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING *`,
    [input.username, input.password_hash, input.avatar, input.avatar_color],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertUser: insert returned no row");
  }
  return row;
}
