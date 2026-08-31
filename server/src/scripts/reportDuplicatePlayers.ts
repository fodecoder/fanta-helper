import { pool } from "../db/client";
import { listPlayers } from "../db/players";
import type { PlayerRow } from "../db/types";

// Rileva (non cancella) i duplicati già presenti in `player`, con lo stesso
// criterio del nuovo upsert:
//  - stesso `fanta_id` non-null su più righe → il bug storico (upsert su
//    name+team che non scattava al cambio squadra);
//  - stesso `name` normalizzato su squadre diverse → candidato "cambio
//    squadra" da fondere a mano.
// La fusione va fatta manualmente: ripuntare le FK e cancellare la riga
// perdente è un'operazione distruttiva che richiede conferma umana.

const FK_TABLES = [
  "purchase",
  "valuation",
  "user_valuation_override",
  "quotation",
  "player_season_stats",
  "wishlist",
  "probable_lineup (per nome)",
  "set_piece_taker (per nome)",
  "gk_pairing / goalkeeper_grid",
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function groupBy<K>(players: PlayerRow[], keyOf: (p: PlayerRow) => K | null): Map<K, PlayerRow[]> {
  const groups = new Map<K, PlayerRow[]>();
  for (const player of players) {
    const key = keyOf(player);
    if (key === null) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(player);
    groups.set(key, bucket);
  }
  return groups;
}

function printGroups(title: string, groups: Map<unknown, PlayerRow[]>): number {
  const dupes = [...groups.values()].filter((rows) => rows.length > 1);
  if (dupes.length === 0) {
    console.log(`${title}: nessuno.`);
    return 0;
  }
  console.log(`\n${title}: ${dupes.length} gruppo/i`);
  for (const rows of dupes) {
    console.table(
      rows.map((r) => ({ id: r.id, fanta_id: r.fanta_id, name: r.name, team: r.team, ruolo: r.ruolo })),
    );
  }
  return dupes.length;
}

async function reportDuplicatePlayers(): Promise<void> {
  const players = await listPlayers();
  console.log(`Giocatori totali: ${players.length}`);

  const byFantaId = printGroups(
    "Duplicati per fanta_id",
    groupBy(players, (p) => p.fanta_id),
  );
  const byName = printGroups(
    "Candidati cambio squadra (stesso nome, squadra diversa)",
    groupBy(
      players,
      (p) => (p.fanta_id === null ? normalizeName(p.name) : null),
    ),
  );

  if (byFantaId + byName > 0) {
    console.log(
      `\nFusione manuale: per ogni gruppo scegli la riga da tenere, ripunta le FK su player_id ` +
        `nelle tabelle [${FK_TABLES.join(", ")}], poi elimina le righe perdenti.`,
    );
  }
}

reportDuplicatePlayers()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
