import { Router } from "express";
import { teamPrefSchema } from "@fanta-helper/shared";
import { getLeagueById } from "../db/leagues";
import { deleteTeamPref, listTeamPrefs, upsertTeamPref } from "../db/teamPrefs";
import { ApiError } from "../http/errors";

export const teamPrefsRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

interface TeamParams extends LeagueParams {
  team: string;
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

teamPrefsRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    await requireLeague(leagueId);
    res.json(await listTeamPrefs(userId, leagueId));
  } catch (err) {
    next(err);
  }
});

teamPrefsRouter.put<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    await requireLeague(leagueId);
    const input = teamPrefSchema.parse(req.body);
    res.json(await upsertTeamPref(userId, leagueId, input.team, input.kind));
  } catch (err) {
    next(err);
  }
});

teamPrefsRouter.delete<TeamParams>("/:team", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    const team = req.params.team.trim();
    if (team === "") {
      throw ApiError.badRequest("team is required");
    }
    await deleteTeamPref(userId, leagueId, team);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
