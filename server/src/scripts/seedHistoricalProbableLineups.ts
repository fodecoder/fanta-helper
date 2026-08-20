import type { ProbableLineupConfirmEntry } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { findPlayersByNameTeam } from "../db/players";
import { replaceProbableLineupForTeam } from "../db/probableLineup";
import { PROBABLE_LINEUPS_SEED } from "./data/probableLineupsSeed";

// Seed delle probabili formazioni (solo titolari) dal dataset statico in
// `data/probableLineupsSeed.ts`. Il ruolo non è nel dato: viene ricavato dal
// listone (tabella `player`) con match nome+squadra. I nomi non trovati nel
// listone vengono scritti comunque con ruolo null e riportati a console, così
// l'utente sa quali rivedere in-app. Nessuna dipendenza dall'API Claude.
async function seedHistoricalProbableLineups(): Promise<void> {
  const unmatched: string[] = [];

  for (const { team, titolari } of PROBABLE_LINEUPS_SEED) {
    const entries: ProbableLineupConfirmEntry[] = [];
    for (const player_name of titolari) {
      const matches = await findPlayersByNameTeam(player_name, team);
      const ruolo = matches[0]?.ruolo ?? null;
      if (ruolo === null) {
        unmatched.push(`${team} — ${player_name}`);
      }
      entries.push({ player_name, ruolo, stato: "titolare" });
    }

    try {
      await replaceProbableLineupForTeam(team, entries);
      const withRole = entries.filter((e) => e.ruolo !== null).length;
      console.log(
        `[probable_lineup] ${team}: scritti ${entries.length} titolari (${withRole} con ruolo dal listone)`,
      );
    } catch (err) {
      console.error(`[probable_lineup] ${team}: scrittura fallita`, err);
    }
  }

  if (unmatched.length > 0) {
    console.log(
      `\n${unmatched.length} titolari non trovati nel listone (ruolo null, da rivedere):`,
    );
    for (const row of unmatched) {
      console.log(`  - ${row}`);
    }
  }
}

seedHistoricalProbableLineups()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
