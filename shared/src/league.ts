import { z } from "zod";

export const rosterConfigSchema = z
  .object({
    P: z.number().int().nonnegative(),
    D: z.number().int().nonnegative(),
    C: z.number().int().nonnegative(),
    A: z.number().int().nonnegative(),
  })
  .strict();

const jsonObjectSchema = z.record(z.string(), z.unknown());
export const scoringConfigSchema = jsonObjectSchema;
export const modificatoriConfigSchema = jsonObjectSchema;

export type RosterConfig = z.infer<typeof rosterConfigSchema>;
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
export type ModifiersConfig = z.infer<typeof modificatoriConfigSchema>;

export interface LeagueRulesConfig {
  rosterConfig: RosterConfig;
  scoring: ScoringConfig;
  modificatori: ModifiersConfig;
}

export const createLeagueSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  n_squadre: z.number().int().positive(),
  budget: z.number().int().positive(),
  roster_config: rosterConfigSchema,
  scoring: scoringConfigSchema,
  modificatori: modificatoriConfigSchema,
});
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

// PUT /leagues/:id replaces the full row; a partial merge has no well-defined
// semantics for free-form scoring/modificatori JSON, so update reuses the same schema.
export const updateLeagueSchema = createLeagueSchema;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

export const leagueSchema = createLeagueSchema.extend({ id: z.number().int().positive() });
export type League = z.infer<typeof leagueSchema>;
