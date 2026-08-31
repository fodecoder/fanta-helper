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
    `INSERT INTO player (name, team, ruolo, image_url, fanta_id, nome_completo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.name, input.team, input.ruolo, input.image_url, input.fanta_id, input.nome_completo],
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
  nome_completo?: string | null;
  image_url?: string | null;
}

export interface PlayerUpsertResult {
  row: PlayerRow;
  inserted: boolean;
}

const UPSERT_RETURNING =
  "id, fanta_id, sofifa_id, name, nome_completo, team, ruolo, image_url, (xmax = 0) AS inserted";

function splitInserted(row: PlayerRow & { inserted: boolean }): PlayerUpsertResult {
  const { inserted, ...playerRow } = row;
  return { row: playerRow, inserted };
}

// fanta_id è la chiave stabile del giocatore (SPEC.md): quando presente,
// identifica la riga anche se `name`/`team` cambiano tra due import (es.
// trasferimento). L'upsert su `(name, team)` non lo faceva — stesso giocatore
// con squadra diversa creava un duplicato. Percorso:
//  1. se esiste già una riga con quel fanta_id → UPDATE per id (aggiorna anche
//     name/team);
//  2. altrimenti INSERT con fallback ON CONFLICT (name, team): adotta una riga
//     name+team senza fanta_id (backfill) o ne crea una nuova.
// nome_completo/image_url sono COALESCE(nuovo, esistente): il listone li
// aggiorna quando li fornisce, senza mai azzerarli se assenti nel file.
export async function upsertPlayer(
  input: PlayerUpsertInput,
  executor: Queryable = pool,
): Promise<PlayerUpsertResult> {
  const fantaId = input.fanta_id ?? null;
  const nomeCompleto = input.nome_completo ?? null;
  const imageUrl = input.image_url ?? null;

  if (fantaId !== null) {
    const byFantaId = await executor.query<PlayerRow & { inserted: boolean }>(
      `UPDATE player
         SET name = $1, team = $2, ruolo = $3,
             nome_completo = COALESCE($5, nome_completo),
             image_url = COALESCE($6, image_url)
       WHERE fanta_id = $4
       RETURNING ${UPSERT_RETURNING}`,
      [input.name, input.team, input.ruolo, fantaId, nomeCompleto, imageUrl],
    );
    const updated = byFantaId.rows[0];
    if (updated) {
      return { ...splitInserted(updated), inserted: false };
    }
  }

  const result = await executor.query<PlayerRow & { inserted: boolean }>(
    `INSERT INTO player (name, team, ruolo, fanta_id, nome_completo, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name, team) DO UPDATE
       SET ruolo = EXCLUDED.ruolo,
           fanta_id = COALESCE(player.fanta_id, EXCLUDED.fanta_id),
           nome_completo = COALESCE(EXCLUDED.nome_completo, player.nome_completo),
           image_url = COALESCE(EXCLUDED.image_url, player.image_url)
     RETURNING ${UPSERT_RETURNING}`,
    [input.name, input.team, input.ruolo, fantaId, nomeCompleto, imageUrl],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertPlayer: upsert returned no row");
  }
  return splitInserted(row);
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

// Fills in the SoFIFA player id for a player matched by the seed. Guarded by
// `sofifa_id IS NULL` so it never overwrites a mapping already trusted,
// mirroring backfillPlayerFantaId. Returns the number of rows updated so the
// seed can report unique-vs-skipped matches.
export async function backfillPlayerSofifaId(
  playerId: number,
  sofifaId: number,
  executor: Queryable = pool,
): Promise<number> {
  const result = await executor.query(
    "UPDATE player SET sofifa_id = $1 WHERE id = $2 AND sofifa_id IS NULL",
    [sofifaId, playerId],
  );
  return result.rowCount ?? 0;
}
