import { z } from "zod";
import { roleSchema } from "./roles";
import { discardedExtractionRowSchema } from "./extraction";

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// `target`, `fair_value`, `max_bid`, `panic_price` sono sempre su base 1000
// crediti (indipendentemente dal budget reale della lega): il valore SALVATO
// resta quello importato/generato, invariato. Le viste che lo mostrano
// riscalano a lettura per il budget della lega — vedi valuationScale.ts.
// I quattro importi di listino sono su base 1000 crediti e trattati come
// interi in tutto il sistema (colonne INTEGER, input non frazionabili). I
// listini generati fuori da qui (es. Claude) possono emettere decimali: li
// arrotondiamo in ingresso invece di scartare l'intera riga.
const creditAmount = z
  .number()
  .nonnegative()
  .transform((v) => Math.round(v));

export const valuationEntrySchema = z.object({
  name: z.string().trim().min(1),
  team: z.string().trim().min(1),
  ruolo: roleSchema,
  tier: z.string().trim().min(1),
  target: creditAmount,
  fair_value: creditAmount,
  max_bid: creditAmount,
  panic_price: creditAmount,
  confidence: z.enum(CONFIDENCE_LEVELS),
  note: z.string().nullable().optional(),
});
export type Valuation = z.infer<typeof valuationEntrySchema>;

export const valuationImportSchema = z.object({
  league_name: z.string().trim().min(1),
  generated_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "invalid ISO 8601 date"),
  players: z.array(valuationEntrySchema).min(1),
});
export type ValuationImport = z.infer<typeof valuationImportSchema>;

export const unmatchedValuationSchema = valuationEntrySchema.extend({ reason: z.string() });
export type UnmatchedValuation = z.infer<typeof unmatchedValuationSchema>;

// Riga di players[] che non rispetta valuationEntrySchema (campo mancante,
// tipo sbagliato, enum non valido). name/team/ruolo sono estratti
// best-effort dalla riga grezza e possono essere null se non estraibili.
export const discardedValuationRowSchema = z.object({
  row: z.number().int().positive(),
  name: z.string().nullable(),
  team: z.string().nullable(),
  ruolo: z.string().nullable(),
  reason: z.string(),
});
export type DiscardedValuationRow = z.infer<typeof discardedValuationRowSchema>;

export const valuationImportReportSchema = z.object({
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unmatched: z.array(unmatchedValuationSchema),
  discarded: z.array(discardedValuationRowSchema),
  // Numero di override personali azzerati perché l'import ha sovrascritto le
  // modifiche dell'utente (0 se non richiesto o se non ne aveva).
  overridesCleared: z.number().int().nonnegative().default(0),
});
export type ValuationImportReport = z.infer<typeof valuationImportReportSchema>;

// Valida solo l'involucro del documento di import: i singoli elementi di
// players[] restano unknown, per poter essere validati uno a uno lato server
// (safeParse per riga) invece di far fallire l'intero import su una riga sola.
export const valuationImportEnvelopeSchema = z.object({
  league_name: z.string().trim().min(1),
  generated_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "invalid ISO 8601 date"),
  players: z.array(z.unknown()).min(1),
});
export type ValuationImportEnvelope = z.infer<typeof valuationImportEnvelopeSchema>;

// Used by the manual reconciliation endpoint, where the player is already
// resolved by id, so name/team/ruolo (matching-only fields) are omitted.
export const valuationUpsertSchema = valuationEntrySchema.omit({
  name: true,
  team: true,
  ruolo: true,
});
export type ValuationUpsertInput = z.infer<typeof valuationUpsertSchema>;

export const valuationRecordSchema = valuationUpsertSchema.extend({
  league_id: z.number().int().positive(),
  player_id: z.number().int().positive(),
});
export type ValuationRecord = z.infer<typeof valuationRecordSchema>;

// Override personale (per-utente) dei valori del listino. Tabella sparsa:
// ogni campo è nullable e opzionale, il valore effettivo a lettura è
// `coalesce(override, base)`. La base resta immutabile e condivisa; l'override
// vale solo per l'utente che lo scrive. Stessa base 1000 crediti dei valori di
// listino — il riscalaggio per il budget di lega resta a carico della vista.
export const valuationOverridePatchSchema = z
  .object({
    target: z.number().int().nonnegative().nullable(),
    fair_value: z.number().int().nonnegative().nullable(),
    max_bid: z.number().int().nonnegative().nullable(),
    panic_price: z.number().int().nonnegative().nullable(),
    note: z.string().trim().min(1).nullable(),
  })
  .partial();
export type ValuationOverridePatch = z.infer<typeof valuationOverridePatchSchema>;

export const valuationOverrideSchema = z.object({
  target: z.number().int().nonnegative().nullable(),
  fair_value: z.number().int().nonnegative().nullable(),
  max_bid: z.number().int().nonnegative().nullable(),
  panic_price: z.number().int().nonnegative().nullable(),
  note: z.string().nullable(),
});
export type ValuationOverride = z.infer<typeof valuationOverrideSchema>;

export const valuationWithPlayerSchema = valuationRecordSchema.extend({
  name: z.string(),
  team: z.string(),
  ruolo: roleSchema,
  image_url: z.string().nullable(),
  // I campi ereditati sopra sono il valore COALESCED (override → base).
  // `override` porta i valori grezzi dell'override dell'utente corrente
  // (null dove il campo non è sovrascritto), o null se non esiste override.
  override: valuationOverrideSchema.nullable(),
});
export type ValuationWithPlayer = z.infer<typeof valuationWithPlayerSchema>;

// Anteprima di generazione (POST /valuations/generate): riga risolta a un
// player_id ma non ancora persistita — l'utente la rivede/modifica prima di
// salvarla (stesso PUT /:playerId usato per l'import JSON).
export const valuationMatchedDraftSchema = valuationEntrySchema.extend({
  player_id: z.number().int().positive(),
});
export type ValuationMatchedDraft = z.infer<typeof valuationMatchedDraftSchema>;

export const valuationGenerationResponseSchema = z.object({
  matched: z.array(valuationMatchedDraftSchema),
  unmatched: z.array(unmatchedValuationSchema),
  discarded: z.array(discardedExtractionRowSchema),
});
export type ValuationGenerationResponse = z.infer<typeof valuationGenerationResponseSchema>;
