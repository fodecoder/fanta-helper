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
const PLAYER_COLUMNS_P = PLAYER_COLUMNS.split(", ")
  .map((c) => `p.${c}`)
  .join(", ");

// Conflitto di identità irrisolvibile in automatico: due righe distinte in DB
// rivendicano lo stesso giocatore (una per fanta_id, una per name+team), o il
// file assegna a un fanta_id un name+team già occupato. Non si sceglie né si
// fonde d'ufficio: la riga finisce nel report di scarto, la fusione è
// l'operazione manuale di `db:report:duplicate-players`.
export class PlayerUpsertConflict extends Error {}

type PlayerIdentity = Pick<PlayerRow, "id" | "fanta_id" | "name" | "team">;

export type PlayerUpsertDecision =
  | { action: "insert" }
  | { action: "update"; id: number }
  | { action: "conflict"; message: string };

const nameTeamKey = (name: string, team: string) =>
  `${name.trim().toLowerCase()}|${team.trim().toLowerCase()}`;

// Regole di conflitto d'identità, unica fonte di verità condivisa da
// `upsertPlayer` (query per riga) e `batchUpsertPlayers` (risoluzione in
// memoria). `target` è la riga già risolta come bersaglio (per fanta_id o
// come unica riga name+team); `sameNameTeamCount` conta le righe name+team
// quando NON c'è un target per fanta_id; `blockerId` è un'altra riga che
// occupa già il name+team di destinazione quando il target si sposta.
export function decidePlayerUpsert(args: {
  input: PlayerUpsertInput;
  target: PlayerIdentity | undefined;
  sameNameTeamCount: number;
  blockerId: number | undefined;
}): PlayerUpsertDecision {
  const { input, target, sameNameTeamCount, blockerId } = args;
  const fantaId = input.fanta_id ?? null;

  if (!target) {
    if (sameNameTeamCount > 1) {
      return {
        action: "conflict",
        message: `più righe già presenti per '${input.name}' / '${input.team}'`,
      };
    }
    return { action: "insert" };
  }

  if (fantaId !== null && target.fanta_id !== null && target.fanta_id !== fantaId) {
    return {
      action: "conflict",
      message: `la riga esistente ha fanta_id ${target.fanta_id}, il file ${fantaId}`,
    };
  }
  if ((target.name !== input.name || target.team !== input.team) && blockerId !== undefined) {
    return {
      action: "conflict",
      message: `'${input.name}' / '${input.team}' è già un'altra riga (id ${blockerId})`,
    };
  }
  return { action: "update", id: target.id };
}

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
  let sameNameTeamCount = 0;
  if (!target) {
    const sameNameTeam = (
      await executor.query<PlayerRow>(
        `SELECT ${PLAYER_COLUMNS} FROM player
         WHERE lower(trim(name)) = lower(trim($1)) AND lower(trim(team)) = lower(trim($2))`,
        [input.name, input.team],
      )
    ).rows;
    sameNameTeamCount = sameNameTeam.length;
    target = sameNameTeam[0];
  }

  let blockerId: number | undefined;
  if (target && (target.name !== input.name || target.team !== input.team)) {
    blockerId = (
      await executor.query<{ id: number }>(
        `SELECT id FROM player
         WHERE lower(trim(name)) = lower(trim($1)) AND lower(trim(team)) = lower(trim($2))
           AND id <> $3`,
        [input.name, input.team, target.id],
      )
    ).rows[0]?.id;
  }

  const decision = decidePlayerUpsert({
    input,
    target,
    sameNameTeamCount: target ? 0 : sameNameTeamCount,
    blockerId,
  });
  if (decision.action === "conflict") {
    throw new PlayerUpsertConflict(decision.message);
  }

  if (decision.action === "update") {
    const updated = (
      await executor.query<PlayerRow>(
        `UPDATE player
           SET name = $1, team = $2, ruolo = $3,
               fanta_id = COALESCE(fanta_id, $4),
               nome_completo = COALESCE($5, nome_completo),
               image_url = COALESCE($6, image_url)
         WHERE id = $7
         RETURNING ${PLAYER_COLUMNS}`,
        [input.name, input.team, input.ruolo, fantaId, nomeCompleto, imageUrl, decision.id],
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

export type PlayerBatchUpsertOutcome =
  | { ok: true; result: PlayerUpsertResult }
  | { ok: false; message: string };

// Numero massimo di righe per singola query batch: `pg` ha un tetto di 65535
// parametri per statement, l'INSERT usa 6 colonne e l'UPDATE 7 — 200 righe
// (max 1400 parametri) sta larghissimo e tiene le query leggibili nei log.
const BATCH_ROWS = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

interface UpsertNode {
  // undefined finché l'INSERT non è stato eseguito.
  id: number | undefined;
  fanta_id: number | null;
  name: string;
  team: string;
  ruolo: Role;
  nome_completo: string | null;
  image_url: string | null;
  // Ogni indice di `inputs` risolto su questo nodo, con il flag `inserted`
  // che il chiamante deve vedere: la prima riga che crea il nodo è un
  // insert, ogni riga successiva sullo stesso nodo è un update (come
  // avverrebbe riga-per-riga, dove la seconda troverebbe la riga già scritta).
  assignments: { index: number; inserted: boolean }[];
}

// Stesso contratto di N `upsertPlayer` in sequenza, ma con un solo SELECT di
// lettura e INSERT/UPDATE in batch: la risoluzione dei conflitti avviene in
// memoria via `decidePlayerUpsert`. Non lancia su conflitto d'identità: lo
// restituisce come `{ ok: false }` allineato per indice, così il chiamante lo
// tratta come scarto (come il `catch (PlayerUpsertConflict)` per riga).
export async function batchUpsertPlayers(
  inputs: PlayerUpsertInput[],
  executor: Queryable = pool,
): Promise<PlayerBatchUpsertOutcome[]> {
  const outcomes: PlayerBatchUpsertOutcome[] = new Array(inputs.length);
  if (inputs.length === 0) return outcomes;

  const existing = (
    await executor.query<PlayerIdentity>("SELECT id, fanta_id, name, team FROM player")
  ).rows;

  const byFantaId = new Map<number, UpsertNode>();
  const byNameTeam = new Map<string, UpsertNode[]>();
  const register = (node: UpsertNode) => {
    if (node.fanta_id !== null) byFantaId.set(node.fanta_id, node);
    const key = nameTeamKey(node.name, node.team);
    const bucket = byNameTeam.get(key);
    if (bucket) bucket.push(node);
    else byNameTeam.set(key, [node]);
  };
  const unregisterNameTeam = (node: UpsertNode) => {
    const key = nameTeamKey(node.name, node.team);
    const bucket = byNameTeam.get(key);
    if (!bucket) return;
    const at = bucket.indexOf(node);
    if (at !== -1) bucket.splice(at, 1);
  };

  for (const row of existing) {
    register({
      id: row.id,
      fanta_id: row.fanta_id,
      name: row.name,
      team: row.team,
      ruolo: "P",
      nome_completo: null,
      image_url: null,
      assignments: [],
    });
  }

  const pendingInserts: UpsertNode[] = [];
  const updates: UpsertNode[] = [];

  inputs.forEach((input, index) => {
    const fantaId = input.fanta_id ?? null;

    let target: UpsertNode | undefined;
    if (fantaId !== null) target = byFantaId.get(fantaId);
    let sameNameTeamCount = 0;
    if (!target) {
      const bucket = byNameTeam.get(nameTeamKey(input.name, input.team)) ?? [];
      sameNameTeamCount = bucket.length;
      target = bucket[0];
    }

    let blockerId: number | undefined;
    if (target && (target.name !== input.name || target.team !== input.team)) {
      const blocker = (byNameTeam.get(nameTeamKey(input.name, input.team)) ?? []).find(
        (n) => n !== target,
      );
      if (blocker) blockerId = blocker.id ?? -1;
    }

    const decision = decidePlayerUpsert({
      input,
      target: target
        ? { id: target.id ?? -1, fanta_id: target.fanta_id, name: target.name, team: target.team }
        : undefined,
      sameNameTeamCount: target ? 0 : sameNameTeamCount,
      blockerId,
    });

    if (decision.action === "conflict") {
      outcomes[index] = { ok: false, message: decision.message };
      return;
    }

    if (decision.action === "insert") {
      const node: UpsertNode = {
        id: undefined,
        fanta_id: fantaId,
        name: input.name,
        team: input.team,
        ruolo: input.ruolo,
        nome_completo: input.nome_completo ?? null,
        image_url: input.image_url ?? null,
        assignments: [{ index, inserted: true }],
      };
      pendingInserts.push(node);
      register(node);
      return;
    }

    // update: `target` è certo qui.
    const node = target!;
    unregisterNameTeam(node);
    if (node.fanta_id === null && fantaId !== null) {
      node.fanta_id = fantaId;
      byFantaId.set(fantaId, node);
    }
    node.name = input.name;
    node.team = input.team;
    node.ruolo = input.ruolo;
    node.nome_completo = input.nome_completo ?? node.nome_completo;
    node.image_url = input.image_url ?? node.image_url;
    node.assignments.push({ index, inserted: false });
    register(node);
    if (node.id !== undefined && !updates.includes(node)) updates.push(node);
  });

  for (const batch of chunk(pendingInserts, BATCH_ROWS)) {
    const params: unknown[] = [];
    const tuples = batch.map((node, i) => {
      const b = i * 6;
      params.push(node.name, node.team, node.ruolo, node.fanta_id, node.nome_completo, node.image_url);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    });
    const rows = (
      await executor.query<PlayerRow>(
        `INSERT INTO player (name, team, ruolo, fanta_id, nome_completo, image_url)
         VALUES ${tuples.join(", ")}
         RETURNING ${PLAYER_COLUMNS}`,
        params,
      )
    ).rows;
    // L'ordine di RETURNING non è garantito per un INSERT multi-riga: si
    // riassocia per chiave naturale (fanta_id, o name+team normalizzato).
    const byFanta = new Map<number, PlayerRow>();
    const byKey = new Map<string, PlayerRow>();
    for (const row of rows) {
      if (row.fanta_id !== null) byFanta.set(row.fanta_id, row);
      byKey.set(nameTeamKey(row.name, row.team), row);
    }
    for (const node of batch) {
      const row =
        node.fanta_id !== null
          ? byFanta.get(node.fanta_id)
          : byKey.get(nameTeamKey(node.name, node.team));
      if (!row) throw new Error("batchUpsertPlayers: inserted row not found in RETURNING");
      node.id = row.id;
      for (const a of node.assignments) {
        outcomes[a.index] = { ok: true, result: { row, inserted: a.inserted } };
      }
    }
  }

  for (const batch of chunk(updates, BATCH_ROWS)) {
    const params: unknown[] = [];
    const tuples = batch.map((node, i) => {
      const b = i * 7;
      params.push(node.id, node.name, node.team, node.ruolo, node.fanta_id, node.nome_completo, node.image_url);
      const cast = i === 0 ? ["::int", "::text", "::text", "::text", "::int", "::text", "::text"] : ["", "", "", "", "", "", ""];
      return `($${b + 1}${cast[0]}, $${b + 2}${cast[1]}, $${b + 3}${cast[2]}, $${b + 4}${cast[3]}, $${b + 5}${cast[4]}, $${b + 6}${cast[5]}, $${b + 7}${cast[6]})`;
    });
    const rows = (
      await executor.query<PlayerRow>(
        `UPDATE player AS p
            SET name = v.name, team = v.team, ruolo = v.ruolo,
                fanta_id = COALESCE(p.fanta_id, v.fanta_id),
                nome_completo = COALESCE(v.nome_completo, p.nome_completo),
                image_url = COALESCE(v.image_url, p.image_url)
           FROM (VALUES ${tuples.join(", ")}) AS v(id, name, team, ruolo, fanta_id, nome_completo, image_url)
          WHERE p.id = v.id
        RETURNING ${PLAYER_COLUMNS_P}`,
        params,
      )
    ).rows;
    const byId = new Map<number, PlayerRow>();
    for (const row of rows) byId.set(row.id, row);
    for (const node of batch) {
      const row = byId.get(node.id!);
      if (!row) throw new Error("batchUpsertPlayers: updated row not found in RETURNING");
      for (const a of node.assignments) {
        outcomes[a.index] = { ok: true, result: { row, inserted: a.inserted } };
      }
    }
  }

  return outcomes;
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
