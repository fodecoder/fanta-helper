import { z } from "zod";

// La griglia portieri è un file di riferimento (indipendente dalle leghe e dagli
// acquisti): per ogni squadra di Serie A la gerarchia dei portieri (1 = titolare).
// Serve solo alla consultazione durante l'asta, non entra nello stato derivato.
export const goalkeeperGridEntrySchema = z.object({
  team: z.string(),
  rank: z.number().int().positive(),
  name: z.string(),
});
export type GoalkeeperGridEntry = z.infer<typeof goalkeeperGridEntrySchema>;

export const discardedGridRowSchema = z.object({
  row: z.number().int().positive(),
  team: z.string(),
  reason: z.string(),
});
export type DiscardedGridRow = z.infer<typeof discardedGridRowSchema>;

export const goalkeeperGridImportReportSchema = z.object({
  teams: z.number().int().nonnegative(),
  entries: z.number().int().nonnegative(),
  discarded: z.array(discardedGridRowSchema),
});
export type GoalkeeperGridImportReport = z.infer<typeof goalkeeperGridImportReportSchema>;
