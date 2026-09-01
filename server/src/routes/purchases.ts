import { Router } from "express";
import { createPurchaseSchema } from "@fanta-helper/shared";
import {
  listPurchasesWithDetailsByLeague,
  insertPurchase,
  deleteLastPurchase,
  deletePurchaseByPlayer,
} from "../db/purchases";
import { getLeagueById } from "../db/leagues";
import { getManagerById } from "../db/managers";
import { getPlayerById } from "../db/players";
import { getManagerAuctionStatuses } from "../db/derived";
import { ApiError } from "../http/errors";

export const purchasesRouter = Router({ mergeParams: true });

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

purchasesRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await listPurchasesWithDetailsByLeague(leagueId));
  } catch (err) {
    next(err);
  }
});

purchasesRouter.get<LeagueParams>("/state", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await getManagerAuctionStatuses(leagueId));
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const input = createPurchaseSchema.parse(req.body);
    const manager = await getManagerById(input.manager_id, leagueId);
    if (!manager) {
      throw ApiError.notFound(`manager ${input.manager_id} not found in league ${leagueId}`);
    }
    const player = await getPlayerById(input.player_id);
    if (!player) {
      throw ApiError.notFound(`player ${input.player_id} not found`);
    }
    const purchase = await insertPurchase({
      league_id: leagueId,
      player_id: input.player_id,
      manager_id: input.manager_id,
      prezzo: input.prezzo,
    });
    res.status(201).json(purchase);
  } catch (err) {
    next(err);
  }
});

purchasesRouter.delete<LeagueParams>("/last", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const removed = await deleteLastPurchase(leagueId);
    if (!removed) {
      throw ApiError.notFound(`league ${leagueId} has no purchases to undo`);
    }
    res.json(removed);
  } catch (err) {
    next(err);
  }
});

purchasesRouter.delete<LeagueParams & { playerId: string }>(
  "/:playerId",
  async (req, res, next) => {
    try {
      const leagueId = parseId(req.params.leagueId);
      const playerId = parseId(req.params.playerId);
      const league = await getLeagueById(leagueId);
      if (!league) {
        throw ApiError.notFound(`league ${leagueId} not found`);
      }
      const removed = await deletePurchaseByPlayer(leagueId, playerId);
      if (!removed) {
        throw ApiError.notFound(
          `league ${leagueId} has no purchase for player ${playerId}`,
        );
      }
      res.json(removed);
    } catch (err) {
      next(err);
    }
  },
);
