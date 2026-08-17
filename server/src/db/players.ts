import { pool } from "./client";
import type { PlayerRow } from "./types";
import type { Role } from "@fanta-helper/shared";

export async function listPlayers(): Promise<PlayerRow[]> {
  const result = await pool.query<PlayerRow>("SELECT * FROM player ORDER BY name");
  return result.rows;
}

export async function getPlayerById(id: number): Promise<PlayerRow | undefined> {
  const result = await pool.query<PlayerRow>("SELECT * FROM player WHERE id = $1", [id]);
  return result.rows[0];
}

export async function findPlayersByNameTeam(name: string, team: string): Promise<PlayerRow[]> {
  const result = await pool.query<PlayerRow>(
    `SELECT * FROM player
     WHERE lower(trim(name)) = lower(trim($1)) AND lower(trim(team)) = lower(trim($2))`,
    [name, team],
  );
  return result.rows;
}

export async function insertPlayer(input: Omit<PlayerRow, "id">): Promise<PlayerRow> {
  const result = await pool.query<PlayerRow>(
    `INSERT INTO player (name, team, ruolo, image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.name, input.team, input.ruolo, input.image_url],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertPlayer: insert returned no row");
  }
  return row;
}

export interface PlayerUpsertInput {
  name: string;
  team: string;
  ruolo: Role;
}

export interface PlayerUpsertResult {
  row: PlayerRow;
  inserted: boolean;
}

// image_url is intentionally excluded from the ON CONFLICT update: a
// quotazioni reimport must never wipe out an image_url backfilled later.
export async function upsertPlayer(input: PlayerUpsertInput): Promise<PlayerUpsertResult> {
  const result = await pool.query<PlayerRow & { inserted: boolean }>(
    `INSERT INTO player (name, team, ruolo)
     VALUES ($1, $2, $3)
     ON CONFLICT (name, team) DO UPDATE SET ruolo = EXCLUDED.ruolo
     RETURNING id, name, team, ruolo, image_url, (xmax = 0) AS inserted`,
    [input.name, input.team, input.ruolo],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertPlayer: upsert returned no row");
  }
  const { inserted, ...playerRow } = row;
  return { row: playerRow, inserted };
}
