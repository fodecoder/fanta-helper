import { z } from "zod";

// Rigoristi/tiratori di punizioni/corner: riferimento globale (come
// probable_lineup), popolato via import JSON (vedi
// probableFormationImport.ts) o editing manuale. Ingest per-squadra: ogni
// squadra viene sostituita indipendentemente dalle altre (vedi
// replaceSetPieceTakersForTeam).
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

export const setPieceTakerImportReportSchema = z.object({
  team: z.string(),
  entries: z.number().int().nonnegative(),
});
export type SetPieceTakerImportReport = z.infer<typeof setPieceTakerImportReportSchema>;
