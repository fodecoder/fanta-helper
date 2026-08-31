import { z } from "zod";

// Flag "trappola" manuale per lega: layer sparso e additivo, sola
// visualizzazione. Non tocca `fair_value` né il tag "trappola" derivato dal
// modello — l'unione avviene in mergeManualTrapTags (playerTags.ts).
export const playerTrapTagSchema = z.object({
  player_id: z.number().int().positive(),
});
export type PlayerTrapTagInput = z.infer<typeof playerTrapTagSchema>;

export const playerTrapTagRecordSchema = playerTrapTagSchema.extend({
  league_id: z.number().int().positive(),
});
export type PlayerTrapTag = z.infer<typeof playerTrapTagRecordSchema>;
