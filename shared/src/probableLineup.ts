import { z } from "zod";
import { discardedExtractionRowSchema } from "./extraction";

// Formazioni probabili: riferimento globale (come goalkeeper_grid), popolato
// via upload screenshot + estrazione lato backend. Ingest per-squadra: ogni
// squadra viene sostituita indipendentemente dalle altre (vedi
// replaceProbableLineupForTeam).
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

// Riga di bozza restituita dall'estrazione, prima della revisione umana.
// `uncertain`/`reason` segnalano righe che il modello non ha letto con
// sicurezza: niente dati inventati, l'utente decide se correggere o
// scartare.
export const probableLineupDraftRowSchema = z.object({
  player_name: z.string(),
  ruolo: z.string().nullable(),
  stato: probableLineupStatoSchema,
  uncertain: z.boolean(),
  reason: z.string().optional(),
});
export type ProbableLineupDraftRow = z.infer<typeof probableLineupDraftRowSchema>;

export const probableLineupExtractionResponseSchema = z.object({
  team: z.string(),
  rows: z.array(probableLineupDraftRowSchema),
  discarded: z.array(discardedExtractionRowSchema),
});
export type ProbableLineupExtractionResponse = z.infer<
  typeof probableLineupExtractionResponseSchema
>;

export const probableLineupImportReportSchema = z.object({
  team: z.string(),
  entries: z.number().int().nonnegative(),
});
export type ProbableLineupImportReport = z.infer<typeof probableLineupImportReportSchema>;
