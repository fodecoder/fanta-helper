import { generateDefaultValuations, type LeagueRulesConfig } from "@fanta-helper/shared";
import type { ValuationImportReport } from "@fanta-helper/shared";
import type { LeagueRow } from "../db/types";
import { listPlayers } from "../db/players";
import { getLatestQuotationSeason, listQuotationsBySeason } from "../db/quotation";
import { getLatestStatsSeason, listPlayerSeasonStatsBySeason } from "../db/playerSeasonStats";
import { importValuationEntries } from "./valuationJson";

// Genera un listino di base a copertura totale del pool col motore
// deterministico in `shared` (nessuna chiamata a Claude) e lo persiste con la
// stessa pipeline dell'import JSON. Serve a poter partire — e quindi
// modificare le valutazioni come override — senza avere un JSON pronto.
export async function generateDefaultValuationsForLeague(
  league: LeagueRow,
): Promise<ValuationImportReport> {
  const [players, quotationSeason, statsSeason] = await Promise.all([
    listPlayers(),
    getLatestQuotationSeason(),
    getLatestStatsSeason(),
  ]);
  const [quotations, stats] = await Promise.all([
    quotationSeason !== null ? listQuotationsBySeason(quotationSeason) : Promise.resolve([]),
    statsSeason !== null ? listPlayerSeasonStatsBySeason(statsSeason) : Promise.resolve([]),
  ]);

  const rules: LeagueRulesConfig = {
    rosterConfig: league.roster_config,
    scoring: league.scoring,
    modificatori: league.modificatori,
  };

  const envelope = generateDefaultValuations({
    players,
    quotations,
    stats,
    rules,
    nSquadre: league.n_squadre,
    leagueName: league.name,
  });

  return importValuationEntries(league.id, envelope.players);
}
