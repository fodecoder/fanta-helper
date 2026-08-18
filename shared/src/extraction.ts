import { z } from "zod";

// Righe che un'estrazione LLM ha restituito ma che non rispettano lo schema
// atteso: scartate esplicitamente, mai forzate in una forma valida —
// principio "unmatched/discarded, mai dati inventati" condiviso da tutti i
// flussi di estrazione (formazioni probabili, valutazioni generate, ...).
export const discardedExtractionRowSchema = z.object({
  index: z.number().int().nonnegative(),
  reason: z.string(),
});
export type DiscardedExtractionRow = z.infer<typeof discardedExtractionRowSchema>;
