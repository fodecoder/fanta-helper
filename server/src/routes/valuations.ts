import { Router } from "express";
import { valuationUpsertSchema } from "@fanta-helper/shared";
import { getLeagueById } from "../db/leagues";
import { getPlayerById } from "../db/players";
import { listValuationsWithPlayerByLeague, upsertValuation } from "../db/valuations";
import { importValuationsFromJson } from "../import/valuationJson";
import { ApiError } from "../http/errors";

export const valuationsRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

interface ValuationParams extends LeagueParams {
  playerId: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

valuationsRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await listValuationsWithPlayerByLeague(leagueId));
  } catch (err) {
    next(err);
  }
});

valuationsRouter.post<LeagueParams>("/import", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const report = await importValuationsFromJson(leagueId, league, req.body);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

valuationsRouter.put<ValuationParams>("/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const playerId = parseId(req.params.playerId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const player = await getPlayerById(playerId);
    if (!player) {
      throw ApiError.notFound(`player ${playerId} not found`);
    }
    const input = valuationUpsertSchema.parse(req.body);
    const { row } = await upsertValuation({
      league_id: leagueId,
      player_id: playerId,
      tier: input.tier,
      target: input.target,
      fair_value: input.fair_value,
      max_bid: input.max_bid,
      panic_price: input.panic_price,
      confidence: input.confidence,
      note: input.note ?? null,
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
});
