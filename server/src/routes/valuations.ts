import { Router } from "express";
import { valuationOverridePatchSchema, valuationUpsertSchema } from "@fanta-helper/shared";
import { getLeagueById } from "../db/leagues";
import { getPlayerById } from "../db/players";
import {
  listValuationsWithPlayerByLeagueForUser,
  upsertValuation,
} from "../db/valuations";
import {
  deleteValuationOverride,
  upsertValuationOverride,
} from "../db/valuationOverrides";
import { importValuationsFromJson } from "../import/valuationJson";
import { generateValuationsForLeague } from "../import/valuationGenerate";
import { generateDefaultValuationsForLeague } from "../import/valuationDefaults";
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

function requireUserId(req: { userId?: number }): number {
  if (!req.userId) {
    throw ApiError.unauthorized("authentication required");
  }
  return req.userId;
}

valuationsRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await listValuationsWithPlayerByLeagueForUser(leagueId, userId));
  } catch (err) {
    next(err);
  }
});

valuationsRouter.put<ValuationParams>("/overrides/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const playerId = parseId(req.params.playerId);
    const userId = requireUserId(req);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const player = await getPlayerById(playerId);
    if (!player) {
      throw ApiError.notFound(`player ${playerId} not found`);
    }
    const patch = valuationOverridePatchSchema.parse(req.body);
    const outcome = await upsertValuationOverride(userId, leagueId, playerId, patch);
    res.json(outcome.kind === "set" ? outcome.row : { cleared: true });
  } catch (err) {
    next(err);
  }
});

valuationsRouter.delete<ValuationParams>("/overrides/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const playerId = parseId(req.params.playerId);
    const userId = requireUserId(req);
    await deleteValuationOverride(userId, leagueId, playerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

valuationsRouter.post<LeagueParams>("/import", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const userId = requireUserId(req);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const report = await importValuationsFromJson(leagueId, req.body, {
      userId,
      overwriteOverrides: req.query.overwriteOverrides === "1",
    });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

valuationsRouter.post<LeagueParams>("/generate", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    const report = await generateValuationsForLeague(league);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

valuationsRouter.post<LeagueParams>("/generate-default", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await generateDefaultValuationsForLeague(league));
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
