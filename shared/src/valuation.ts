import { z } from "zod";
import { roleSchema } from "./roles";
import { discardedExtractionRowSchema } from "./extraction";

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// `target`, `fair_value`, `max_bid`, `panic_price` sono sempre su base 1000
// crediti (indipendentemente dal budget reale della lega): il valore SALVATO
// resta quello importato/generato, invariato. Le viste che lo mostrano
// riscalano a lettura per il budget della lega — vedi valuationScale.ts.
export const valuationEntrySchema = z.object({
  name: z.string().trim().min(1),
  team: z.string().trim().min(1),
  ruolo: roleSchema,
  tier: z.string().trim().min(1),
  target: z.number().int().nonnegative(),
  fair_value: z.number().int().nonnegative(),
  max_bid: z.number().int().nonnegative(),
  panic_price: z.number().int().nonnegative(),
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

export const valuationWithPlayerSchema = valuationRecordSchema.extend({
  name: z.string(),
  team: z.string(),
  ruolo: roleSchema,
  image_url: z.string().nullable(),
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
