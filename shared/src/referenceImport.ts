import { z } from "zod";

// Riga scartata da uno degli importer storici (quotazioni/statistiche): nessun
// match affidabile sul pool `player` (né per fanta_id né per name+team di
// fallback), oppure un valore non interpretabile. Mai stimata o inventata:
// solo segnalata, coerente con l'invariante "unmatched/discarded" già usata
// per l'import dei player.
export const discardedReferenceRowSchema = z.object({
  row: z.number().int().positive(),
  fanta_id: z.string().nullable(),
  name: z.string(),
  team: z.string(),
  reason: z.string(),
});
export type DiscardedReferenceRow = z.infer<typeof discardedReferenceRowSchema>;
