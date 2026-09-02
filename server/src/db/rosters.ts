import {
  computePlayerRecommendations,
  computePlayerTags,
  type LeagueRulesConfig,
  type ManagerRoster,
  type RosterPlayer,
} from "@fanta-helper/shared";
import type { LeagueRow } from "./types";
import { listManagersByLeague } from "./managers";
import { listPlayers } from "./players";
import { listPurchasesWithDetailsByLeague } from "./purchases";
import { listQuotationsBySeason, getLatestQuotationSeason } from "./quotation";
import { listPlayerSeasonStatsBySeason, getLatestStatsSeason } from "./playerSeasonStats";
import { getManagerAuctionStatuses } from "./derived";
import { listProbableLineup } from "./probableLineup";
import { listSetPieceTakers } from "./setPieceTaker";
import { ApiError } from "../http/errors";

// Rosa di ogni manager derivata dal log immutabile `purchase`, con ogni
// giocatore annotato con fascia e tag del motore consigli. Nessuno stato
// calcolato viene scritto: tutto ricalcolato a ogni chiamata, stesso spirito
// di `getManagerAuctionStatuses`.
//
// Il motore gira con `purchasedPlayerIds` VUOTO di proposito: la scarsità e il
// VORP vengono così calcolati sull'intero pool, cioè come forza "assoluta" del
// giocatore, non come residuo di mercato. È la base corretta per dire se un
// avversario ha già preso giocatori forti in un ruolo.
export async function getManagerRosters(league: LeagueRow): Promise<ManagerRoster[]> {
  const [
    managers,
    players,
    purchases,
    quotationSeason,
    statsSeason,
    managerStatuses,
    probableLineup,
    setPieceTaker,
  ] = await Promise.all([
    listManagersByLeague(league.id),
    listPlayers(),
    listPurchasesWithDetailsByLeague(league.id),
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

  // Come in getPlayerRecommendations: gli svincolati escono, ma quelli già in
  // rosa restano per non perderne tier/tag.
  const purchasedIds = new Set(purchases.map((p) => p.player_id));
  const activePlayers = players.filter((p) => p.active || purchasedIds.has(p.id));

  const recommendations = computePlayerRecommendations({
    rules,
    nSquadre: league.n_squadre,
    players: activePlayers,
    quotations,
    stats,
    purchasedPlayerIds: new Set(),
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
  });
  const tierByPlayerId = new Map(recommendations.map((r) => [r.player_id, r.tier]));

  const playersByManager = new Map<number, RosterPlayer[]>();
  for (const p of purchases) {
    const list = playersByManager.get(p.manager_id) ?? [];
    list.push({
      player_id: p.player_id,
      name: p.player_name,
      ruolo: p.player_ruolo,
      prezzo: p.prezzo,
      tier: tierByPlayerId.get(p.player_id) ?? "",
      tags: tagsByPlayerId.get(p.player_id) ?? [],
    });
    playersByManager.set(p.manager_id, list);
  }

  return managers.map((m) => ({
    managerId: m.id,
    managerName: m.name,
    isOwner: m.is_owner,
    players: playersByManager.get(m.id) ?? [],
  }));
}
