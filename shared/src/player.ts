import { z } from "zod";
import { roleSchema } from "./roles";
import { quotationImportReportSchema } from "./quotation";

export const playerSchema = z.object({
  id: z.number().int().positive(),
  fanta_id: z.number().int().positive().nullable(),
  name: z.string(),
  team: z.string(),
  ruolo: roleSchema,
  image_url: z.string().nullable(),
});
export type Player = z.infer<typeof playerSchema>;

export const discardedPlayerRowSchema = z.object({
  row: z.number().int().positive(),
  name: z.string(),
  team: z.string(),
  ruolo: z.string(),
  reason: z.string(),
});
export type DiscardedPlayerRow = z.infer<typeof discardedPlayerRowSchema>;

// `quotation` is non-null only when the uploaded file also carried
// quotation columns (Id, Qt.A, Qt.I, FVM) — a plain CSV/legacy player-only
// xlsx import leaves it null.
export const playerImportReportSchema = z.object({
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  discarded: z.array(discardedPlayerRowSchema),
  quotation: quotationImportReportSchema.nullable(),
});
export type PlayerImportReport = z.infer<typeof playerImportReportSchema>;
