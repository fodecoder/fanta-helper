import { z } from "zod";
import { discardedReferenceRowSchema } from "./referenceImport";

// Statistiche per stagione: riferimento globale, solo storico (una stagione
// in corso non ha statistiche complete finché non finisce). Una riga per
// (player_id, season), fonte: variante "base" del file statistiche.
export const playerSeasonStatsRowSchema = z.object({
  player_id: z.number().int().positive(),
  season: z.string(),
  presenze: z.number().int().nullable(),
  mv: z.number().nullable(),
  fm: z.number().nullable(),
  gf: z.number().int().nullable(),
  gs: z.number().int().nullable(),
  assist: z.number().int().nullable(),
  rp: z.number().int().nullable(),
  rc: z.number().int().nullable(),
  rig_plus: z.number().int().nullable(),
  rig_minus: z.number().int().nullable(),
  amm: z.number().int().nullable(),
  esp: z.number().int().nullable(),
  autogol: z.number().int().nullable(),
});
export type PlayerSeasonStatsRow = z.infer<typeof playerSeasonStatsRowSchema>;

export const playerSeasonStatsImportReportSchema = z.object({
  season: z.string(),
  written: z.number().int().nonnegative(),
  discarded: z.array(discardedReferenceRowSchema),
});
export type PlayerSeasonStatsImportReport = z.infer<typeof playerSeasonStatsImportReportSchema>;

// Ultima stagione con presenze per un elenco di player_id (una riga per
// player, quella con la season più recente tra cui presenze > 0). Un player
// senza nessuna stagione con presenze è semplicemente assente dall'array,
// mai una riga stimata/a zero.
export const playerLatestSeasonStatsSchema = z.object({
  player_id: z.number().int().positive(),
  season: z.string(),
  presenze: z.number().int().nullable(),
  mv: z.number().nullable(),
  fm: z.number().nullable(),
  gf: z.number().int().nullable(),
  assist: z.number().int().nullable(),
});
export type PlayerLatestSeasonStats = z.infer<typeof playerLatestSeasonStatsSchema>;

export const playerLatestSeasonStatsResponseSchema = z.array(playerLatestSeasonStatsSchema);
export type PlayerLatestSeasonStatsResponse = z.infer<
  typeof playerLatestSeasonStatsResponseSchema
>;
