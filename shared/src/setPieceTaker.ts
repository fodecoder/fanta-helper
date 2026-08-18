import { z } from "zod";
import { discardedExtractionRowSchema } from "./extraction";

// Rigoristi/tiratori di punizioni/corner: riferimento globale (come
// probable_lineup), popolato via upload screenshot + estrazione lato
// backend. Ingest per-squadra: ogni squadra viene sostituita
// indipendentemente dalle altre (vedi replaceSetPieceTakersForTeam).
export const SET_PIECE_TAKER_TIPI = ["rigore", "punizione", "corner"] as const;
export const setPieceTakerTipoSchema = z.enum(SET_PIECE_TAKER_TIPI);
export type SetPieceTakerTipo = z.infer<typeof setPieceTakerTipoSchema>;

export const setPieceTakerEntrySchema = z.object({
  team: z.string(),
  tipo: setPieceTakerTipoSchema,
  player_name: z.string(),
  rank: z.number().int().min(1),
});
export type SetPieceTakerEntry = z.infer<typeof setPieceTakerEntrySchema>;

// Riga finalizzata (senza team, che arriva dalla route) inviata dal client al
// termine della revisione — nessun campo `uncertain`: a questo punto l'utente
// ha già rivisto/rimosso le righe incerte.
export const setPieceTakerConfirmEntrySchema = z.object({
  tipo: setPieceTakerTipoSchema,
  player_name: z.string().min(1),
  rank: z.number().int().min(1),
});
export type SetPieceTakerConfirmEntry = z.infer<typeof setPieceTakerConfirmEntrySchema>;

export const setPieceTakerConfirmRequestSchema = z.array(setPieceTakerConfirmEntrySchema);

// Riga di bozza restituita dall'estrazione, prima della revisione umana.
// `uncertain`/`reason` segnalano righe che il modello non ha letto con
// sicurezza: niente dati inventati, l'utente decide se correggere o
// scartare.
export const setPieceTakerDraftRowSchema = z.object({
  tipo: setPieceTakerTipoSchema,
  player_name: z.string(),
  rank: z.number().int().min(1),
  uncertain: z.boolean(),
  reason: z.string().optional(),
});
export type SetPieceTakerDraftRow = z.infer<typeof setPieceTakerDraftRowSchema>;

export const setPieceTakerExtractionResponseSchema = z.object({
  team: z.string(),
  rows: z.array(setPieceTakerDraftRowSchema),
  discarded: z.array(discardedExtractionRowSchema),
});
export type SetPieceTakerExtractionResponse = z.infer<
  typeof setPieceTakerExtractionResponseSchema
>;

export const setPieceTakerImportReportSchema = z.object({
  team: z.string(),
  entries: z.number().int().nonnegative(),
});
export type SetPieceTakerImportReport = z.infer<typeof setPieceTakerImportReportSchema>;
