import { z } from "zod";

// Acquisto reale che non può essere esportato perché il player non ha
// fanta_id mappato: mai emesso come riga CSV a id vuoto, sempre segnalato.
export const rosterExportUnresolvedSchema = z.object({
  managerName: z.string(),
  playerId: z.number().int().positive(),
  playerName: z.string(),
  reason: z.string(),
});
export type RosterExportUnresolved = z.infer<typeof rosterExportUnresolvedSchema>;

export const rosterExportResultSchema = z.object({
  csv: z.string(),
  rowCount: z.number().int().nonnegative(),
  unresolved: z.array(rosterExportUnresolvedSchema),
});
export type RosterExportResult = z.infer<typeof rosterExportResultSchema>;

export const discardedRosterRowSchema = z.object({
  row: z.number().int().positive(),
  managerName: z.string(),
  fantaId: z.string(),
  prezzo: z.string(),
  reason: z.string(),
});
export type DiscardedRosterRow = z.infer<typeof discardedRosterRowSchema>;

export const rosterImportReportSchema = z.object({
  imported: z.number().int().nonnegative(),
  discarded: z.array(discardedRosterRowSchema),
  unknownManagers: z.array(z.string()),
});
export type RosterImportReport = z.infer<typeof rosterImportReportSchema>;
