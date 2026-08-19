import { z } from "zod";
import { discardedReferenceRowSchema } from "./referenceImport";

// Quotazioni per stagione: riferimento globale (storico + corrente), una
// riga per (player_id, season). Colonne Classic del listone (Qt.A, Qt.I,
// FVM) — le varianti Mantra non si importano.
export const quotationRowSchema = z.object({
  player_id: z.number().int().positive(),
  season: z.string(),
  qt_i: z.number().int().nullable(),
  qt_a: z.number().int().nullable(),
  fvm: z.number().int().nullable(),
});
export type QuotationRow = z.infer<typeof quotationRowSchema>;

export const quotationImportReportSchema = z.object({
  season: z.string(),
  written: z.number().int().nonnegative(),
  discarded: z.array(discardedReferenceRowSchema),
});
export type QuotationImportReport = z.infer<typeof quotationImportReportSchema>;
