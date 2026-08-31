import { z } from "zod";
import { roleSchema } from "./roles";

// Tag del motore consigli, ridichiarati come schema per la risposta rosa:
// `PlayerTag` in playerTags.ts è una pura interfaccia TS senza schema zod.
const rosterPlayerTagSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const rosterPlayerSchema = z.object({
  player_id: z.number().int().positive(),
  name: z.string(),
  ruolo: roleSchema,
  prezzo: z.number().int().nonnegative(),
  // Fascia e tag del motore consigli calcolati sull'intero pool (vedi
  // server/src/db/rosters.ts): forza "assoluta" del giocatore, non residuo
  // di mercato.
  tier: z.string(),
  tags: z.array(rosterPlayerTagSchema),
});
export type RosterPlayer = z.infer<typeof rosterPlayerSchema>;

export const managerRosterSchema = z.object({
  managerId: z.number().int().positive(),
  managerName: z.string(),
  isOwner: z.boolean(),
  players: z.array(rosterPlayerSchema),
});
export type ManagerRoster = z.infer<typeof managerRosterSchema>;
