import { Router } from "express";
import { playerTrapTagSchema } from "@fanta-helper/shared";
import { getLeagueById } from "../db/leagues";
import {
  addPlayerTrapTag,
  deletePlayerTrapTag,
  listPlayerTrapTags,
} from "../db/playerTrapTags";
import { ApiError } from "../http/errors";

export const playerTrapTagsRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

interface PlayerParams extends LeagueParams {
  playerId: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

function requireUserId(req: { userId?: number }): number {
  if (!req.userId) {
    throw ApiError.unauthorized("authentication required");
  }
  return req.userId;
}

async function requireLeague(leagueId: number) {
  const league = await getLeagueById(leagueId);
  if (!league) {
    throw ApiError.notFound(`league ${leagueId} not found`);
  }
  return league;
}

playerTrapTagsRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    await requireLeague(leagueId);
    res.json(await listPlayerTrapTags(userId, leagueId));
  } catch (err) {
    next(err);
  }
});

playerTrapTagsRouter.put<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    await requireLeague(leagueId);
    const input = playerTrapTagSchema.parse(req.body);
    await addPlayerTrapTag(userId, leagueId, input.player_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

playerTrapTagsRouter.delete<PlayerParams>("/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    const playerId = parseId(req.params.playerId);
    await deletePlayerTrapTag(userId, leagueId, playerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
