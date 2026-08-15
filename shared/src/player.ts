import { z } from "zod";

export const discardedPlayerRowSchema = z.object({
  row: z.number().int().positive(),
  name: z.string(),
  team: z.string(),
  ruolo: z.string(),
  reason: z.string(),
});
export type DiscardedPlayerRow = z.infer<typeof discardedPlayerRowSchema>;

export const playerImportReportSchema = z.object({
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  discarded: z.array(discardedPlayerRowSchema),
});
export type PlayerImportReport = z.infer<typeof playerImportReportSchema>;
