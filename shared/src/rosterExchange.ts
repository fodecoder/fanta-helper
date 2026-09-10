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

// Fase 1 dell'import rose: un blocco CSV con il manager proposto per somiglianza
// nome (pre-fill non vincolante). `suggestedManagerId` null se nessun manager
// supera la soglia di similarità.
export const rosterImportBlockPreviewSchema = z.object({
  csvTeamName: z.string(),
  rowCount: z.number().int().nonnegative(),
  suggestedManagerId: z.number().int().positive().nullable(),
  suggestedManagerName: z.string().nullable(),
});
export type RosterImportBlockPreview = z.infer<typeof rosterImportBlockPreviewSchema>;

export const rosterImportPreviewResultSchema = z.object({
  blocks: z.array(rosterImportBlockPreviewSchema),
});
export type RosterImportPreviewResult = z.infer<typeof rosterImportPreviewResultSchema>;

// Fase 2: il CSV grezzo invariato più il mapping nome-squadra → managerId
// confermato dall'utente. La risoluzione del manager passa da confronto per
// nome a lookup in questo mapping.
export const rosterImportCommitRequestSchema = z.object({
  csv: z.string(),
  mapping: z.record(z.string(), z.number().int().positive()),
});
export type RosterImportCommitRequest = z.infer<typeof rosterImportCommitRequestSchema>;
