import { z } from "zod";

// La matrice coppie portieri è un file di riferimento globale (indipendente
// dalle leghe e dagli acquisti): per ogni coppia di squadre, un punteggio di
// favorevolezza dell'accoppiamento dei due portieri (più basso = i due
// portieri giocano meno spesso in casa nella stessa giornata; 0 = stadio
// condiviso). Serve solo alla consultazione durante l'asta, non entra nello
// stato derivato.
export const gkPairingEntrySchema = z.object({
  teamA: z.string(),
  teamB: z.string(),
  score: z.number().int().nonnegative(),
});
export type GkPairingEntry = z.infer<typeof gkPairingEntrySchema>;

export const discardedGkPairingRowSchema = z.object({
  row: z.number().int().positive(),
  label: z.string(),
  reason: z.string(),
});
export type DiscardedGkPairingRow = z.infer<typeof discardedGkPairingRowSchema>;

export const gkPairingImportReportSchema = z.object({
  teams: z.number().int().nonnegative(),
  pairs: z.number().int().nonnegative(),
  discarded: z.array(discardedGkPairingRowSchema),
});
export type GkPairingImportReport = z.infer<typeof gkPairingImportReportSchema>;
