import { z } from "zod";

// Performance axis (API-Football): real match output for the live season.
export const playerStatsSchema = z.object({
  player_id: z.number().int().positive(),
  minutes: z.number().int().nonnegative().nullable(),
  goals: z.number().int().nonnegative().nullable(),
  assists: z.number().int().nonnegative().nullable(),
});
export type PlayerStats = z.infer<typeof playerStatsSchema>;

// Attribute axis (SoFIFA / EA FC): game ratings and profile, not real output.
// `value` is the FIFA market value in euros. A different data axis from
// performance stats — never interchangeable with it.
export const playerAttributesSchema = z.object({
  player_id: z.number().int().positive(),
  overall: z.number().int().nonnegative().nullable(),
  potential: z.number().int().nonnegative().nullable(),
  age: z.number().int().nonnegative().nullable(),
  value: z.number().int().nonnegative().nullable(),
});
export type PlayerAttributes = z.infer<typeof playerAttributesSchema>;

// One optional provider's contribution. `stats` only contains resolved players;
// ids omitted from the array are unmatched or unavailable and must be treated as
// empty, never estimated. `source` is the attribution label, null when disabled.
export function providerEnrichmentSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    enabled: z.boolean(),
    source: z.string().nullable(),
    stats: z.array(item),
  });
}

export const statsEnrichmentResponseSchema = z.object({
  performance: providerEnrichmentSchema(playerStatsSchema),
  attributes: providerEnrichmentSchema(playerAttributesSchema),
});
export type StatsEnrichmentResponse = z.infer<typeof statsEnrichmentResponseSchema>;

export type ProviderEnrichment<T> = { enabled: boolean; source: string | null; stats: T[] };
