import { z } from "zod";
import { roleSchema } from "./roles";

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

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

export const valuationImportReportSchema = z.object({
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unmatched: z.array(unmatchedValuationSchema),
});
export type ValuationImportReport = z.infer<typeof valuationImportReportSchema>;

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
