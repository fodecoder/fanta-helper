import { pool } from "./client";
import type { Queryable } from "./client";
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
    `INSERT INTO player (name, team, ruolo, image_url, fanta_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name, input.team, input.ruolo, input.image_url, input.fanta_id],
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
  fanta_id?: number | null;
}

export interface PlayerUpsertResult {
  row: PlayerRow;
  inserted: boolean;
}

// image_url is intentionally excluded from the ON CONFLICT update: a
// quotazioni reimport must never wipe out an image_url backfilled later.
// fanta_id follows the same principle: on conflict it's only filled in when
// currently NULL (COALESCE keeps the existing value), so a reimport never
// overwrites an id already trusted.
export async function upsertPlayer(
  input: PlayerUpsertInput,
  executor: Queryable = pool,
): Promise<PlayerUpsertResult> {
  const result = await executor.query<PlayerRow & { inserted: boolean }>(
    `INSERT INTO player (name, team, ruolo, fanta_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name, team) DO UPDATE
       SET ruolo = EXCLUDED.ruolo, fanta_id = COALESCE(player.fanta_id, EXCLUDED.fanta_id)
     RETURNING id, fanta_id, name, team, ruolo, image_url, (xmax = 0) AS inserted`,
    [input.name, input.team, input.ruolo, input.fanta_id ?? null],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertPlayer: upsert returned no row");
  }
  const { inserted, ...playerRow } = row;
  return { row: playerRow, inserted };
}

// Used by the historical quotation import to fill in fanta_id for players
// matched by name+team fallback (the file has an Id the player pool didn't
// have yet). Guarded by `fanta_id IS NULL` so it never overwrites a value
// already trusted, mirroring upsertPlayer's own COALESCE behavior.
export async function backfillPlayerFantaId(
  playerId: number,
  fantaId: number,
  executor: Queryable = pool,
): Promise<void> {
  await executor.query("UPDATE player SET fanta_id = $1 WHERE id = $2 AND fanta_id IS NULL", [
    fantaId,
    playerId,
  ]);
}
