import { valuationImportSchema } from "@fanta-helper/shared";
import type { UnmatchedValuation, ValuationImportReport } from "@fanta-helper/shared";
import { findPlayersByNameTeam } from "../db/players";
import { upsertValuation } from "../db/valuations";
import type { LeagueRow } from "../db/types";
import { ApiError } from "../http/errors";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export async function importValuationsFromJson(
  leagueId: number,
  league: LeagueRow,
  body: unknown,
): Promise<ValuationImportReport> {
  const doc = valuationImportSchema.parse(body);

  if (normalize(doc.league_name) !== normalize(league.name)) {
    throw ApiError.badRequest(
      `league_name "${doc.league_name}" does not match target league "${league.name}"`,
    );
  }

  let imported = 0;
  let updated = 0;
  const unmatched: UnmatchedValuation[] = [];

  for (const entry of doc.players) {
    const matches = await findPlayersByNameTeam(entry.name, entry.team);
    if (matches.length === 0) {
      unmatched.push({ ...entry, reason: "nessun giocatore trovato per nome+squadra" });
      continue;
    }
    if (matches.length > 1) {
      unmatched.push({ ...entry, reason: `match ambiguo: ${matches.length} giocatori trovati` });
      continue;
    }

    const { inserted } = await upsertValuation({
      league_id: leagueId,
      player_id: matches[0]!.id,
      tier: entry.tier,
      target: entry.target,
      fair_value: entry.fair_value,
      max_bid: entry.max_bid,
      panic_price: entry.panic_price,
      confidence: entry.confidence,
      note: entry.note ?? null,
    });
    if (inserted) {
      imported += 1;
    } else {
      updated += 1;
    }
  }

  return { imported, updated, unmatched };
}
