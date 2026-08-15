import { pool } from "./client";
import type { ValuationRow } from "./types";

export async function listValuationsByLeague(leagueId: number): Promise<ValuationRow[]> {
  const result = await pool.query<ValuationRow>(
    "SELECT * FROM valuation WHERE league_id = $1 ORDER BY player_id",
    [leagueId],
  );
  return result.rows;
}

export async function getValuation(leagueId: number, playerId: number): Promise<ValuationRow | undefined> {
  const result = await pool.query<ValuationRow>(
    "SELECT * FROM valuation WHERE league_id = $1 AND player_id = $2",
    [leagueId, playerId],
  );
  return result.rows[0];
}

export async function insertValuation(input: ValuationRow): Promise<ValuationRow> {
  const result = await pool.query<ValuationRow>(
    `INSERT INTO valuation
       (league_id, player_id, tier, target, fair_value, max_bid, panic_price, confidence, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.league_id,
      input.player_id,
      input.tier,
      input.target,
      input.fair_value,
      input.max_bid,
      input.panic_price,
      input.confidence,
      input.note,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertValuation: insert returned no row");
  }
  return row;
}
