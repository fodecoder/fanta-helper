import { Router } from "express";
import { getLeagueById } from "../db/leagues";
import { getPlayerRecommendations } from "../db/recommendations";
import { ApiError } from "../http/errors";

export const recommendationsRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

recommendationsRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await getPlayerRecommendations(league));
  } catch (err) {
    next(err);
  }
});
