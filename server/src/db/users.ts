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

export async function listOtherUsers(excludeId: number): Promise<AppUserRow[]> {
  const result = await pool.query<AppUserRow>(
    "SELECT * FROM app_user WHERE id <> $1 ORDER BY username",
    [excludeId],
  );
  return result.rows;
}

export async function updateUserProfile(
  id: number,
  input: { avatar: string | null; avatar_color: string | null },
): Promise<AppUserRow | undefined> {
  const result = await pool.query<AppUserRow>(
    `UPDATE app_user SET avatar = $2, avatar_color = $3 WHERE id = $1 RETURNING *`,
    [id, input.avatar, input.avatar_color],
  );
  return result.rows[0];
}

export async function upsertUser(input: Omit<AppUserRow, "id">): Promise<AppUserRow> {
  const result = await pool.query<AppUserRow>(
    `INSERT INTO app_user (username, password_hash, avatar, avatar_color, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role
     RETURNING *`,
    [input.username, input.password_hash, input.avatar, input.avatar_color, input.role],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertUser: insert returned no row");
  }
  return row;
}
