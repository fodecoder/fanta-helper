import type { SetPieceTakerConfirmEntry } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { replaceSetPieceTakersForTeam } from "../db/setPieceTaker";
import { SET_PIECE_TAKERS_SEED } from "./data/setPieceTakersSeed";

// Seed dei rigoristi/tiratori da fermo a partire dal dataset statico in
// `data/setPieceTakersSeed.ts` (trascritto dal PDF). Nessuna dipendenza da
// pdf-parse o dall'API Claude: la pagina "Rigoristi e calci piazzati" resta la
// fonte di correzione in-app, questo è solo il seme iniziale.
async function seedHistoricalSetPieceTakers(): Promise<void> {
  for (const { team, rigore, punizione } of SET_PIECE_TAKERS_SEED) {
    const entries: SetPieceTakerConfirmEntry[] = [
      ...rigore.map((player_name, i) => ({
        tipo: "rigore" as const,
        player_name,
        rank: i + 1,
      })),
      ...punizione.map((player_name, i) => ({
        tipo: "punizione" as const,
        player_name,
        rank: i + 1,
      })),
    ];

    try {
      await replaceSetPieceTakersForTeam(team, entries);
      console.log(`[set_piece_taker] ${team}: scritte ${entries.length} righe`);
    } catch (err) {
      console.error(`[set_piece_taker] ${team}: scrittura fallita`, err);
    }
  }
}

seedHistoricalSetPieceTakers()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
