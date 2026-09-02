import {
  applyTeamPreferences,
  computePlayerRecommendations,
  computePlayerTags,
  mergeManualTrapTags,
  type LeagueRulesConfig,
  type PlayerRecommendationWithTags,
  type TeamPrefKind,
} from "@fanta-helper/shared";
import { listTeamPrefs } from "./teamPrefs";
import { listPlayerTrapTags } from "./playerTrapTags";
import { listValuationsWithPlayerByLeagueForUser } from "./valuations";
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
  userId: number,
): Promise<PlayerRecommendationWithTags[]> {
  const [
    players,
    purchases,
    quotationSeason,
    statsSeason,
    managerStatuses,
    probableLineup,
    setPieceTaker,
    teamPrefs,
    valuations,
    manualTrapPlayerIds,
  ] = await Promise.all([
    listPlayers(),
    listPurchasesByLeague(league.id),
    getLatestQuotationSeason(),
    getLatestStatsSeason(),
    getManagerAuctionStatuses(league.id),
    listProbableLineup(),
    listSetPieceTakers(),
    listTeamPrefs(userId, league.id),
    listValuationsWithPlayerByLeagueForUser(league.id, userId),
    listPlayerTrapTags(userId, league.id),
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

  // Gli svincolati/ceduti (player.active = false) escono da tutte le viste
  // derivate — ranking, valutazioni, ricerca in asta — tranne quando già
  // acquistati in questa lega, per non perderne tier/tag nella rosa.
  const purchasedIds = new Set(purchases.map((p) => p.player_id));
  const activePlayers = players.filter((p) => p.active || purchasedIds.has(p.id));

  const recommendations = computePlayerRecommendations({
    rules,
    nSquadre: league.n_squadre,
    players: activePlayers,
    quotations,
    stats,
    purchasedPlayerIds: purchasedIds,
    ioStatus,
    probableLineup,
  });

  const tagsByPlayerId = computePlayerTags({
    players: activePlayers,
    stats,
    quotations,
    setPieceTaker,
    probableLineup,
    rules,
    recommendations,
    fairValueByPlayerId: new Map(valuations.map((v) => [v.player_id, v.fair_value])),
  });

  const withTags: PlayerRecommendationWithTags[] = recommendations.map((r) => ({
    ...r,
    tags: tagsByPlayerId.get(r.player_id) ?? [],
  }));

  // Layer per-utente sparso: il flag "trappola" manuale si aggiunge a quello
  // derivato senza sostituirlo (mergeManualTrapTags), poi il flag squadra
  // annota e riordina a parità di fascia senza toccare score/tier.
  const withTrapTags = mergeManualTrapTags(withTags, manualTrapPlayerIds);
  const prefsByTeam = new Map<string, TeamPrefKind>(teamPrefs.map((p) => [p.team, p.kind]));
  return applyTeamPreferences(withTrapTags, prefsByTeam);
}
