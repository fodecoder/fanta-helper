import { pool } from "./client";
import type { PurchaseRow } from "./types";

export async function listPurchasesByLeague(leagueId: number): Promise<PurchaseRow[]> {
  const result = await pool.query<PurchaseRow>("SELECT * FROM purchase WHERE league_id = $1 ORDER BY ts", [
    leagueId,
  ]);
  return result.rows;
}

export async function insertPurchase(input: Omit<PurchaseRow, "ts">): Promise<PurchaseRow> {
  const result = await pool.query<PurchaseRow>(
    `INSERT INTO purchase (league_id, player_id, manager_id, prezzo)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.league_id, input.player_id, input.manager_id, input.prezzo],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertPurchase: insert returned no row");
  }
  return row;
}
