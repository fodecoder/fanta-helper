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

const PLAYER_COLUMNS = "id, fanta_id, sofifa_id, name, nome_completo, team, ruolo, image_url";

// Conflitto di identità irrisolvibile in automatico: due righe distinte in DB
// rivendicano lo stesso giocatore (una per fanta_id, una per name+team), o il
// file assegna a un fanta_id un name+team già occupato. Non si sceglie né si
// fonde d'ufficio: la riga finisce nel report di scarto, la fusione è
// l'operazione manuale di `db:report:duplicate-players`.
export class PlayerUpsertConflict extends Error {}

// fanta_id è la chiave stabile del giocatore (SPEC.md): quando presente,
// identifica la riga anche se `name`/`team` cambiano tra due import (es.
// trasferimento). Risolve il bersaglio in memoria e scrive solo mosse sicure,
// così un vincolo unico (`player_name_team_uk`/`player_fanta_id_uk`) non viene
// mai violato a livello DB (che abortirebbe l'intera transazione d'import):
//  - riga con quel fanta_id → UPDATE per id (aggiorna anche name/team);
//  - altrimenti unica riga name+team → UPDATE per id (adotta/backfilla fanta_id);
//  - altrimenti INSERT.
// Se lo spostamento di name/team calpesterebbe un'altra riga, o il fanta_id
// esistente è diverso da quello del file → PlayerUpsertConflict.
// nome_completo/image_url sono COALESCE(nuovo, esistente): il listone li
// aggiorna quando li fornisce, senza mai azzerarli se assenti nel file.
export async function upsertPlayer(
  input: PlayerUpsertInput,
  executor: Queryable = pool,
): Promise<PlayerUpsertResult> {
  const fantaId = input.fanta_id ?? null;
  const nomeCompleto = input.nome_completo ?? null;
  const imageUrl = input.image_url ?? null;

  let target: PlayerRow | undefined;
  if (fantaId !== null) {
    target = (
      await executor.query<PlayerRow>(`SELECT ${PLAYER_COLUMNS} FROM player WHERE fanta_id = $1`, [
        fantaId,
      ])
    ).rows[0];
  }
  if (!target) {
    const sameNameTeam = (
      await executor.query<PlayerRow>(
        `SELECT ${PLAYER_COLUMNS} FROM player
         WHERE lower(trim(name)) = lower(trim($1)) AND lower(trim(team)) = lower(trim($2))`,
        [input.name, input.team],
      )
    ).rows;
    if (sameNameTeam.length > 1) {
      throw new PlayerUpsertConflict(
        `più righe già presenti per '${input.name}' / '${input.team}'`,
      );
    }
    target = sameNameTeam[0];
  }

  if (target) {
    if (fantaId !== null && target.fanta_id !== null && target.fanta_id !== fantaId) {
      throw new PlayerUpsertConflict(
        `la riga esistente ha fanta_id ${target.fanta_id}, il file ${fantaId}`,
      );
    }
    if (target.name !== input.name || target.team !== input.team) {
      const blocker = (
        await executor.query<{ id: number }>(
          `SELECT id FROM player
           WHERE lower(trim(name)) = lower(trim($1)) AND lower(trim(team)) = lower(trim($2))
             AND id <> $3`,
          [input.name, input.team, target.id],
        )
      ).rows[0];
      if (blocker) {
        throw new PlayerUpsertConflict(
          `'${input.name}' / '${input.team}' è già un'altra riga (id ${blocker.id})`,
        );
      }
    }
    const updated = (
      await executor.query<PlayerRow>(
        `UPDATE player
           SET name = $1, team = $2, ruolo = $3,
               fanta_id = COALESCE(fanta_id, $4),
               nome_completo = COALESCE($5, nome_completo),
               image_url = COALESCE($6, image_url)
         WHERE id = $7
         RETURNING ${PLAYER_COLUMNS}`,
        [input.name, input.team, input.ruolo, fantaId, nomeCompleto, imageUrl, target.id],
      )
    ).rows[0];
    if (!updated) throw new Error("upsertPlayer: update returned no row");
    return { row: updated, inserted: false };
  }

  const insertedRow = (
    await executor.query<PlayerRow>(
      `INSERT INTO player (name, team, ruolo, fanta_id, nome_completo, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PLAYER_COLUMNS}`,
      [input.name, input.team, input.ruolo, fantaId, nomeCompleto, imageUrl],
    )
  ).rows[0];
  if (!insertedRow) throw new Error("upsertPlayer: insert returned no row");
  return { row: insertedRow, inserted: true };
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
