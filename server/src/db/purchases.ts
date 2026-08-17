import { pool } from "./client";
import type { PurchaseRow } from "./types";
import type { PurchaseWithDetails } from "@fanta-helper/shared";

export async function listPurchasesByLeague(leagueId: number): Promise<PurchaseRow[]> {
  const result = await pool.query<PurchaseRow>("SELECT * FROM purchase WHERE league_id = $1 ORDER BY ts", [
    leagueId,
  ]);
  return result.rows;
}

export async function listPurchasesWithDetailsByLeague(
  leagueId: number,
): Promise<PurchaseWithDetails[]> {
  const result = await pool.query<PurchaseWithDetails>(
    `SELECT purchase.league_id, purchase.player_id, purchase.manager_id, purchase.prezzo, purchase.ts,
            player.name AS player_name, player.team AS player_team, player.ruolo AS player_ruolo,
            player.image_url AS player_image_url, manager.name AS manager_name
     FROM purchase
     JOIN player ON player.id = purchase.player_id
     JOIN manager ON manager.id = purchase.manager_id
     WHERE purchase.league_id = $1
     ORDER BY purchase.ts`,
    [leagueId],
  );
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

// Correcting a mistake is an explicit, traceable removal of the last row —
// never an update — so it goes through this dedicated deletion, not a
// general-purpose "edit a purchase" endpoint. `ctid` breaks ties on `ts`
// deterministically since `purchase` has no auto-incrementing id column.
export async function deleteLastPurchase(leagueId: number): Promise<PurchaseRow | undefined> {
  const result = await pool.query<PurchaseRow>(
    `DELETE FROM purchase
     WHERE ctid = (SELECT ctid FROM purchase WHERE league_id = $1 ORDER BY ts DESC LIMIT 1)
     RETURNING *`,
    [leagueId],
  );
  return result.rows[0];
}

export async function managerHasPurchases(managerId: number, leagueId: number): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM purchase WHERE manager_id = $1 AND league_id = $2 LIMIT 1",
    [managerId, leagueId],
  );
  return (result.rowCount ?? 0) > 0;
}
