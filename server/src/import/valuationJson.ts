import { valuationEntrySchema, valuationImportEnvelopeSchema } from "@fanta-helper/shared";
import type { DiscardedValuationRow, UnmatchedValuation, ValuationImportReport } from "@fanta-helper/shared";
import type { ZodError } from "zod";
import { findPlayersByNameTeam } from "../db/players";
import { upsertValuation } from "../db/valuations";
import { deleteValuationOverridesForPlayers } from "../db/valuationOverrides";
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

// L'import è indipendente dal nome lega: `league_name` resta obbligatorio nello
// schema (documento ben formato) ma non viene confrontato con la lega target,
// così lo stesso listino può essere importato in qualsiasi lega.
// `overwriteOverrides` (con `userId`): dopo l'import azzera gli override
// personali dell'utente per i giocatori abbinati, così il nuovo listino
// prevale sulle modifiche precedenti invece di restarne coperto.
export interface ImportValuationsOptions {
  userId?: number;
  overwriteOverrides?: boolean;
}

export async function importValuationsFromJson(
  leagueId: number,
  body: unknown,
  options?: ImportValuationsOptions,
): Promise<ValuationImportReport> {
  const envelope = valuationImportEnvelopeSchema.parse(body);
  return importValuationEntries(leagueId, envelope.players, options);
}

export async function importValuationEntries(
  leagueId: number,
  rawPlayers: unknown[],
  options?: ImportValuationsOptions,
): Promise<ValuationImportReport> {
  let imported = 0;
  let updated = 0;
  const unmatched: UnmatchedValuation[] = [];
  const discarded: DiscardedValuationRow[] = [];
  const matchedPlayerIds: number[] = [];

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

    matchedPlayerIds.push(matches[0]!.id);
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

  let overridesCleared = 0;
  if (options?.overwriteOverrides && options.userId !== undefined) {
    overridesCleared = await deleteValuationOverridesForPlayers(
      options.userId,
      leagueId,
      matchedPlayerIds,
    );
  }

  return { imported, updated, unmatched, discarded, overridesCleared };
}
