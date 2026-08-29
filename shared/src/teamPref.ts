import { z } from "zod";

// Preferenza di squadra per-utente: un layer personale che NON tocca lo score
// di base condiviso. Effetto deciso: flag in UI + ordinamento secondario a
// parità di fascia (vedi teamPreferences.ts), mai una mutazione del punteggio.
export const TEAM_PREF_KINDS = ["prefer", "avoid"] as const;
export type TeamPrefKind = (typeof TEAM_PREF_KINDS)[number];

export const teamPrefSchema = z.object({
  team: z.string().trim().min(1, "team is required"),
  kind: z.enum(TEAM_PREF_KINDS),
});
export type TeamPrefInput = z.infer<typeof teamPrefSchema>;

export const teamPrefRecordSchema = teamPrefSchema.extend({
  league_id: z.number().int().positive(),
});
export type TeamPref = z.infer<typeof teamPrefRecordSchema>;
