import type { ValuationOverridePatch } from "@fanta-helper/shared";
import { pool } from "./client";
import type { UserValuationOverrideRow } from "./types";

const FIELDS = ["target", "fair_value", "max_bid", "panic_price", "note"] as const;
type Field = (typeof FIELDS)[number];

export async function getOverridesByUserLeague(
  userId: number,
  leagueId: number,
): Promise<Map<number, UserValuationOverrideRow>> {
  const result = await pool.query<UserValuationOverrideRow>(
    "SELECT * FROM user_valuation_override WHERE user_id = $1 AND league_id = $2",
    [userId, leagueId],
  );
  return new Map(result.rows.map((row) => [row.player_id, row]));
}

async function getOverride(
  userId: number,
  leagueId: number,
  playerId: number,
): Promise<UserValuationOverrideRow | undefined> {
  const result = await pool.query<UserValuationOverrideRow>(
    "SELECT * FROM user_valuation_override WHERE user_id = $1 AND league_id = $2 AND player_id = $3",
    [userId, leagueId, playerId],
  );
  return result.rows[0];
}

export type OverrideOutcome =
  | { kind: "set"; row: UserValuationOverrideRow }
  | { kind: "cleared" };

// Upsert sparso: le chiavi presenti nel patch sovrascrivono (anche a null, per
// azzerare il singolo campo), quelle assenti restano invariate. Se dopo il
// merge tutti i campi sono null la riga viene rimossa — nessun override
// "vuoto" persistito, la lettura ripiega interamente sulla base.
export async function upsertValuationOverride(
  userId: number,
  leagueId: number,
  playerId: number,
  patch: ValuationOverridePatch,
): Promise<OverrideOutcome> {
  const existing = await getOverride(userId, leagueId, playerId);
  const merged: Record<Field, number | string | null> = {
    target: existing?.target ?? null,
    fair_value: existing?.fair_value ?? null,
    max_bid: existing?.max_bid ?? null,
    panic_price: existing?.panic_price ?? null,
    note: existing?.note ?? null,
  };
  for (const field of FIELDS) {
    if (field in patch && patch[field] !== undefined) {
      merged[field] = patch[field] as number | string | null;
    }
  }

  if (FIELDS.every((field) => merged[field] === null)) {
    await deleteValuationOverride(userId, leagueId, playerId);
    return { kind: "cleared" };
  }

  const result = await pool.query<UserValuationOverrideRow>(
    `INSERT INTO user_valuation_override
       (user_id, league_id, player_id, target, fair_value, max_bid, panic_price, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, league_id, player_id) DO UPDATE SET
       target = EXCLUDED.target,
       fair_value = EXCLUDED.fair_value,
       max_bid = EXCLUDED.max_bid,
       panic_price = EXCLUDED.panic_price,
       note = EXCLUDED.note
     RETURNING *`,
    [
      userId,
      leagueId,
      playerId,
      merged.target,
      merged.fair_value,
      merged.max_bid,
      merged.panic_price,
      merged.note,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertValuationOverride: upsert returned no row");
  }
  return { kind: "set", row };
}

export async function deleteValuationOverride(
  userId: number,
  leagueId: number,
  playerId: number,
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM user_valuation_override WHERE user_id = $1 AND league_id = $2 AND player_id = $3",
    [userId, leagueId, playerId],
  );
  return (result.rowCount ?? 0) > 0;
}
