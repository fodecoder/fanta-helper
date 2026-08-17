import { pool } from "./client";
import type { ValuationRow } from "./types";
import type { ValuationWithPlayer } from "@fanta-helper/shared";

export async function listValuationsByLeague(leagueId: number): Promise<ValuationRow[]> {
  const result = await pool.query<ValuationRow>(
    "SELECT * FROM valuation WHERE league_id = $1 ORDER BY player_id",
    [leagueId],
  );
  return result.rows;
}

export async function getValuation(
  leagueId: number,
  playerId: number,
): Promise<ValuationRow | undefined> {
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

export async function upsertValuation(
  input: ValuationRow,
): Promise<{ row: ValuationRow; inserted: boolean }> {
  const result = await pool.query<ValuationRow & { inserted: boolean }>(
    `INSERT INTO valuation
       (league_id, player_id, tier, target, fair_value, max_bid, panic_price, confidence, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (league_id, player_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       target = EXCLUDED.target,
       fair_value = EXCLUDED.fair_value,
       max_bid = EXCLUDED.max_bid,
       panic_price = EXCLUDED.panic_price,
       confidence = EXCLUDED.confidence,
       note = EXCLUDED.note
     RETURNING *, (xmax = 0) AS inserted`,
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
    throw new Error("upsertValuation: upsert returned no row");
  }
  const { inserted, ...valuationRow } = row;
  return { row: valuationRow, inserted };
}

export async function listValuationsWithPlayerByLeague(
  leagueId: number,
): Promise<ValuationWithPlayer[]> {
  const result = await pool.query<ValuationWithPlayer>(
    `SELECT v.league_id, v.player_id, v.tier, v.target, v.fair_value, v.max_bid,
            v.panic_price, v.confidence, v.note, p.name, p.team, p.ruolo
     FROM valuation v
     JOIN player p ON p.id = v.player_id
     WHERE v.league_id = $1
     ORDER BY p.name`,
    [leagueId],
  );
  return result.rows;
}
