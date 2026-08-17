import { pool } from "./client";
import type { WishlistRow } from "./types";
import type { WishlistEntryWithPlayer } from "@fanta-helper/shared";

export async function listWishlistWithPlayerByLeague(
  leagueId: number,
): Promise<WishlistEntryWithPlayer[]> {
  const result = await pool.query<WishlistEntryWithPlayer>(
    `SELECT w.league_id, w.player_id, w.priority, w.note,
            p.name, p.team, p.ruolo, p.image_url
     FROM wishlist w
     JOIN player p ON p.id = w.player_id
     WHERE w.league_id = $1
     ORDER BY w.priority NULLS LAST, p.name`,
    [leagueId],
  );
  return result.rows;
}

export async function insertWishlistEntry(leagueId: number, playerId: number): Promise<WishlistRow> {
  const result = await pool.query<WishlistRow>(
    `INSERT INTO wishlist (league_id, player_id)
     VALUES ($1, $2)
     RETURNING *`,
    [leagueId, playerId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertWishlistEntry: insert returned no row");
  }
  return row;
}

export async function updateWishlistEntryNote(
  leagueId: number,
  playerId: number,
  note: string | null,
): Promise<WishlistRow | undefined> {
  const result = await pool.query<WishlistRow>(
    `UPDATE wishlist
     SET note = $3
     WHERE league_id = $1 AND player_id = $2
     RETURNING *`,
    [leagueId, playerId, note],
  );
  return result.rows[0];
}

export async function deleteWishlistEntry(leagueId: number, playerId: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM wishlist WHERE league_id = $1 AND player_id = $2", [
    leagueId,
    playerId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

// Riassegna priority = posizione (1-based) per l'intero elenco di player_ids
// ricevuto, in una transazione: la wishlist mantiene sempre priorità dense e
// contigue, senza buchi da gestire lato client.
export async function reorderWishlist(leagueId: number, playerIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < playerIds.length; i++) {
      await client.query("UPDATE wishlist SET priority = $3 WHERE league_id = $1 AND player_id = $2", [
        leagueId,
        playerIds[i],
        i + 1,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
