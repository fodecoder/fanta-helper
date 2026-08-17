import { z } from "zod";

export const rosterConfigSchema = z
  .object({
    P: z.number().int().nonnegative(),
    D: z.number().int().nonnegative(),
    C: z.number().int().nonnegative(),
    A: z.number().int().nonnegative(),
  })
  .strict();

// Bonus/malus standard del Fantacalcio (regolamento Fantagazzetta). Valori in
// punti: interi o mezzi punti, positivi o negativi. `fasce_gol` sono le soglie
// del punteggio-squadra che valgono una rete (la prima a 66).
export const scoringConfigSchema = z
  .object({
    gol: z.number(),
    assist: z.number(),
    rigore_segnato: z.number(),
    rigore_parato: z.number(),
    rigore_sbagliato: z.number(),
    ammonizione: z.number(),
    espulsione: z.number(),
    autorete: z.number(),
    gol_subito: z.number(),
    fasce_gol: z.array(z.number()).min(1),
  })
  .strict();

const defenseBandSchema = z.object({ media: z.number(), bonus: z.number() }).strict();

// I modificatori valorizzano il rendimento di un reparto anziché il singolo
// episodio. `difesa` porta la tabella media-voto → bonus; gli altri sono toggle.
export const modificatoriConfigSchema = z
  .object({
    difesa: z.object({ enabled: z.boolean(), tabella: z.array(defenseBandSchema).min(1) }).strict(),
    centrocampo: z.object({ enabled: z.boolean() }).strict(),
    attacco: z.object({ enabled: z.boolean() }).strict(),
    portiere: z.object({ enabled: z.boolean() }).strict(),
    capitano: z.object({ enabled: z.boolean() }).strict(),
    modulo: z.object({ enabled: z.boolean() }).strict(),
  })
  .strict();

export type RosterConfig = z.infer<typeof rosterConfigSchema>;
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
export type ModifiersConfig = z.infer<typeof modificatoriConfigSchema>;

export interface LeagueRulesConfig {
  rosterConfig: RosterConfig;
  scoring: ScoringConfig;
  modificatori: ModifiersConfig;
}

export const DEFAULT_N_SQUADRE = 8;
export const DEFAULT_BUDGET = 1000;

export const defaultRosterConfig: RosterConfig = { P: 3, D: 8, C: 8, A: 6 };

export const defaultScoring: ScoringConfig = {
  gol: 3,
  assist: 1,
  rigore_segnato: 2.5,
  rigore_parato: 2.5,
  rigore_sbagliato: -2.5,
  ammonizione: -0.5,
  espulsione: -1,
  autorete: -2,
  gol_subito: -1,
  fasce_gol: [66, 72, 77, 81, 85, 89],
};

export const defaultModificatori: ModifiersConfig = {
  difesa: {
    enabled: true,
    tabella: [
      { media: 6, bonus: 1 },
      { media: 6.5, bonus: 3 },
      { media: 7, bonus: 6 },
    ],
  },
  centrocampo: { enabled: false },
  attacco: { enabled: false },
  portiere: { enabled: false },
  capitano: { enabled: false },
  modulo: { enabled: false },
};

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
