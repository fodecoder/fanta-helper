import { valuationEntrySchema, valuationImportEnvelopeSchema } from "@fanta-helper/shared";
import type { DiscardedValuationRow, UnmatchedValuation, ValuationImportReport } from "@fanta-helper/shared";
import type { ZodError } from "zod";
import { findPlayersByNameTeam } from "../db/players";
import { upsertValuation } from "../db/valuations";
import type { LeagueRow } from "../db/types";
import { ApiError } from "../http/errors";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function stringField(raw: unknown, field: string): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = (raw as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function toDiscardedRow(row: number, raw: unknown, error: ZodError): DiscardedValuationRow {
  const reason = error.issues
    .map((issue) => `${issue.path.join(".") || "?"}: ${issue.message}`)
    .join("; ");
  return {
    row,
    name: stringField(raw, "name"),
    team: stringField(raw, "team"),
    ruolo: stringField(raw, "ruolo"),
    reason,
  };
}

export async function importValuationsFromJson(
  leagueId: number,
  league: LeagueRow,
  body: unknown,
): Promise<ValuationImportReport> {
  const envelope = valuationImportEnvelopeSchema.parse(body);

  if (normalize(envelope.league_name) !== normalize(league.name)) {
    throw ApiError.badRequest(
      `league_name "${envelope.league_name}" does not match target league "${league.name}"`,
    );
  }

  return importValuationEntries(leagueId, envelope.players);
}

export async function importValuationEntries(
  leagueId: number,
  rawPlayers: unknown[],
): Promise<ValuationImportReport> {
  let imported = 0;
  let updated = 0;
  const unmatched: UnmatchedValuation[] = [];
  const discarded: DiscardedValuationRow[] = [];

  for (const [index, raw] of rawPlayers.entries()) {
    const parsed = valuationEntrySchema.safeParse(raw);
    if (!parsed.success) {
      discarded.push(toDiscardedRow(index + 1, raw, parsed.error));
      continue;
    }
    const entry = parsed.data;

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

  return { imported, updated, unmatched, discarded };
}
