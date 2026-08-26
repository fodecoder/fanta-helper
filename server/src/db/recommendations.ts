import {
  computePlayerRecommendations,
  computePlayerTags,
  type LeagueRulesConfig,
  type PlayerRecommendationWithTags,
} from "@fanta-helper/shared";
import type { LeagueRow } from "./types";
import { listPlayers } from "./players";
import { listPurchasesByLeague } from "./purchases";
import { listQuotationsBySeason, getLatestQuotationSeason } from "./quotation";
import { listPlayerSeasonStatsBySeason, getLatestStatsSeason } from "./playerSeasonStats";
import { getManagerAuctionStatuses } from "./derived";
import { listProbableLineup } from "./probableLineup";
import { listSetPieceTakers } from "./setPieceTaker";
import { ApiError } from "../http/errors";

// Assembla gli input grezzi (pool, quotazioni/statistiche dell'ultima
// stagione disponibile, log `purchase`, stato derivato di "Io") e li passa
// al motore puro in `shared`. Nessuno stato calcolato viene scritto: tutto è
// ricalcolato a ogni chiamata, stesso spirito di `getManagerAuctionStatuses`.
export async function getPlayerRecommendations(
  league: LeagueRow,
): Promise<PlayerRecommendationWithTags[]> {
  const [players, purchases, quotationSeason, statsSeason, managerStatuses, probableLineup, setPieceTaker] =
    await Promise.all([
      listPlayers(),
      listPurchasesByLeague(league.id),
      getLatestQuotationSeason(),
      getLatestStatsSeason(),
      getManagerAuctionStatuses(league.id),
      listProbableLineup(),
      listSetPieceTakers(),
    ]);

  const [quotations, stats] = await Promise.all([
    quotationSeason !== null ? listQuotationsBySeason(quotationSeason) : Promise.resolve([]),
    statsSeason !== null ? listPlayerSeasonStatsBySeason(statsSeason) : Promise.resolve([]),
  ]);

  const ioStatus = managerStatuses.find((s) => s.isOwner);
  if (!ioStatus) {
    throw ApiError.notFound(`owner manager not found for league ${league.id}`);
  }

  const rules: LeagueRulesConfig = {
    rosterConfig: league.roster_config,
    scoring: league.scoring,
    modificatori: league.modificatori,
  };

  const recommendations = computePlayerRecommendations({
    rules,
    nSquadre: league.n_squadre,
    players,
    quotations,
    stats,
    purchasedPlayerIds: new Set(purchases.map((p) => p.player_id)),
    ioStatus,
    probableLineup,
  });

  const tagsByPlayerId = computePlayerTags({
    players,
    stats,
    quotations,
    setPieceTaker,
    probableLineup,
    rules,
    recommendations,
  });

  return recommendations.map((r) => ({ ...r, tags: tagsByPlayerId.get(r.player_id) ?? [] }));
}
