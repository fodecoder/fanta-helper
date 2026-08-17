import { z } from "zod";

export const playerStatsSchema = z.object({
  player_id: z.number().int().positive(),
  minutes: z.number().int().nonnegative().nullable(),
  goals: z.number().int().nonnegative().nullable(),
  assists: z.number().int().nonnegative().nullable(),
});
export type PlayerStats = z.infer<typeof playerStatsSchema>;

// `stats` only contains matched players; ids omitted from the array are
// unmatched or unavailable and must be treated as empty, never estimated.
export const statsEnrichmentResponseSchema = z.object({
  enabled: z.boolean(),
  stats: z.array(playerStatsSchema),
});
export type StatsEnrichmentResponse = z.infer<typeof statsEnrichmentResponseSchema>;
