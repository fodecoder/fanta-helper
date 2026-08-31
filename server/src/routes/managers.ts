import { Router } from "express";
import { createManagerSchema, updateManagerSchema } from "@fanta-helper/shared";
import {
  listManagersByLeague,
  getManagerById,
  insertManager,
  updateManager,
  deleteManager,
} from "../db/managers";
import { getLeagueById } from "../db/leagues";
import { managerHasPurchases } from "../db/purchases";
import { getManagerRosters } from "../db/rosters";
import { ApiError } from "../http/errors";

export const managersRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

interface ManagerParams extends LeagueParams {
  id: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

managersRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await listManagersByLeague(leagueId));
  } catch (err) {
    next(err);
  }
});

managersRouter.get<LeagueParams>("/rosters", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await getManagerRosters(league));
  } catch (err) {
    next(err);
  }
});

managersRouter.post<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const input = createManagerSchema.parse(req.body);
    const manager = await insertManager({ league_id: leagueId, name: input.name, is_owner: false });
    res.status(201).json(manager);
  } catch (err) {
    next(err);
  }
});

managersRouter.put<ManagerParams>("/:id", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const id = parseId(req.params.id);
    const input = updateManagerSchema.parse(req.body);
    const manager = await updateManager(id, leagueId, input);
    if (!manager) {
      throw ApiError.notFound(`manager ${id} not found in league ${leagueId}`);
    }
    res.json(manager);
  } catch (err) {
    next(err);
  }
});

managersRouter.delete<ManagerParams>("/:id", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const id = parseId(req.params.id);
    const manager = await getManagerById(id, leagueId);
    if (!manager) {
      throw ApiError.notFound(`manager ${id} not found in league ${leagueId}`);
    }
    if (await managerHasPurchases(id, leagueId)) {
      throw ApiError.conflict("cannot delete a manager with recorded purchases");
    }
    await deleteManager(id, leagueId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
