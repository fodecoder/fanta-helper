import { z } from "zod";
import type { ProbableLineupConfirmEntry } from "./probableLineup";
import type { SetPieceTakerConfirmEntry } from "./setPieceTaker";

// Formato di import per "probabili formazioni e tiratori": una squadra alla
// volta o tutte insieme (array), scritto a mano dall'utente leggendo una
// fonte editoriale (es. infografica di giornata) — non c'è più estrazione
// automatica da screenshot. Un solo oggetto copre sia probable_lineup che
// set_piece_taker perché nella fonte tipica sono la stessa scheda per
// squadra; le due tabelle restano comunque scritte da due chiamate separate
// (vedi toProbableLineupEntries / toSetPieceTakerEntries), ognuna con il
// proprio replace per-squadra.
export const probableFormationTeamInputSchema = z.object({
  team: z.string().min(1),
  // Undici titolari (o quanti leggibili): niente "panchina" in questo
  // formato, la fonte editoriale non la riporta. Chi revisiona può comunque
  // aggiungere righe con stato diverso a mano nella UI.
  titolari: z
    .array(
      z.object({
        player_name: z.string().min(1),
        ruolo: z.string().nullable().optional(),
      }),
    )
    .default([]),
  // Ogni voce è un ballottaggio a due o più opzioni per lo stesso ruolo:
  // tutte le opzioni diventano righe con stato "ballottaggio", nessuna
  // viene preferita automaticamente.
  ballottaggi: z
    .array(
      z.object({
        ruolo: z.string().nullable().optional(),
        opzioni: z.array(z.string().min(1)).min(2),
      }),
    )
    .default([]),
  // Gerarchia in ordine: il primo elemento è rank 1, e così via.
  rigoristi: z.array(z.string().min(1)).default([]),
  punizioni: z.array(z.string().min(1)).default([]),
});
export type ProbableFormationTeamInput = z.infer<typeof probableFormationTeamInputSchema>;

// Accetta sia un singolo oggetto squadra sia un array: stesso formato,
// cambia solo quante squadre si importano in un colpo solo.
export const probableFormationImportInputSchema = z.union([
  probableFormationTeamInputSchema,
  z.array(probableFormationTeamInputSchema),
]);
export type ProbableFormationImportInput = z.infer<typeof probableFormationImportInputSchema>;

export function normalizeProbableFormationInput(
  input: ProbableFormationImportInput,
): ProbableFormationTeamInput[] {
  return Array.isArray(input) ? input : [input];
}

export function toProbableLineupEntries(
  input: ProbableFormationTeamInput,
): ProbableLineupConfirmEntry[] {
  const titolari = input.titolari.map((t) => ({
    player_name: t.player_name,
    ruolo: t.ruolo ?? null,
    stato: "titolare" as const,
  }));
  const ballottaggi = input.ballottaggi.flatMap((b) =>
    b.opzioni.map((player_name) => ({
      player_name,
      ruolo: b.ruolo ?? null,
      stato: "ballottaggio" as const,
    })),
  );
  return [...titolari, ...ballottaggi];
}

export function toSetPieceTakerEntries(
  input: ProbableFormationTeamInput,
): SetPieceTakerConfirmEntry[] {
  const rigori = input.rigoristi.map((player_name, i) => ({
    tipo: "rigore" as const,
    player_name,
    rank: i + 1,
  }));
  const punizioni = input.punizioni.map((player_name, i) => ({
    tipo: "punizione" as const,
    player_name,
    rank: i + 1,
  }));
  return [...rigori, ...punizioni];
}
