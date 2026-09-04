import { z } from "zod";

// Formazioni probabili: riferimento globale (come goalkeeper_grid), popolato
// via import JSON (vedi probableFormationImport.ts) o editing manuale.
// Ingest per-squadra: ogni squadra viene sostituita indipendentemente dalle
// altre (vedi replaceProbableLineupForTeam).
export const PROBABLE_LINEUP_STATI = ["titolare", "panchina", "ballottaggio"] as const;
export const probableLineupStatoSchema = z.enum(PROBABLE_LINEUP_STATI);
export type ProbableLineupStato = z.infer<typeof probableLineupStatoSchema>;

export const probableLineupEntrySchema = z.object({
  team: z.string(),
  player_name: z.string(),
  ruolo: z.string().nullable(),
  stato: probableLineupStatoSchema,
});
export type ProbableLineupEntry = z.infer<typeof probableLineupEntrySchema>;

// Riga finalizzata (senza team, che arriva dalla route) inviata dal client al
// termine della revisione — nessun campo `uncertain`: a questo punto l'utente
// ha già rivisto/rimosso le righe incerte.
export const probableLineupConfirmEntrySchema = z.object({
  player_name: z.string().min(1),
  ruolo: z.string().nullable(),
  stato: probableLineupStatoSchema,
});
export type ProbableLineupConfirmEntry = z.infer<typeof probableLineupConfirmEntrySchema>;

export const probableLineupConfirmRequestSchema = z.array(probableLineupConfirmEntrySchema);

export const probableLineupImportReportSchema = z.object({
  team: z.string(),
  entries: z.number().int().nonnegative(),
});
export type ProbableLineupImportReport = z.infer<typeof probableLineupImportReportSchema>;
