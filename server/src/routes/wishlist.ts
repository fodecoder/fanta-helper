import { Router } from "express";
import { addWishlistEntrySchema, updateWishlistEntrySchema, reorderWishlistSchema } from "@fanta-helper/shared";
import { getLeagueById } from "../db/leagues";
import { getPlayerById } from "../db/players";
import {
  listWishlistWithPlayerByLeague,
  insertWishlistEntry,
  updateWishlistEntryNote,
  deleteWishlistEntry,
  reorderWishlist,
} from "../db/wishlist";
import { ApiError } from "../http/errors";

export const wishlistRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

interface WishlistParams extends LeagueParams {
  playerId: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

async function requireLeague(leagueId: number): Promise<void> {
  const league = await getLeagueById(leagueId);
  if (!league) {
    throw ApiError.notFound(`league ${leagueId} not found`);
  }
}

wishlistRouter.get<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    await requireLeague(leagueId);
    res.json(await listWishlistWithPlayerByLeague(leagueId));
  } catch (err) {
    next(err);
  }
});

wishlistRouter.post<LeagueParams>("/", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    await requireLeague(leagueId);
    const input = addWishlistEntrySchema.parse(req.body);
    const player = await getPlayerById(input.player_id);
    if (!player) {
      throw ApiError.notFound(`player ${input.player_id} not found`);
    }
    const entry = await insertWishlistEntry(leagueId, input.player_id);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// Registrata prima di PUT /:playerId, altrimenti Express interpreterebbe
// "reorder" come valore di :playerId.
wishlistRouter.put<LeagueParams>("/reorder", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    await requireLeague(leagueId);
    const input = reorderWishlistSchema.parse(req.body);
    const current = await listWishlistWithPlayerByLeague(leagueId);
    const currentIds = new Set(current.map((entry) => entry.player_id));
    const sameSet =
      input.player_ids.length === currentIds.size &&
      input.player_ids.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw ApiError.badRequest("player_ids must match exactly the league's current wishlist");
    }
    await reorderWishlist(leagueId, input.player_ids);
    res.json(await listWishlistWithPlayerByLeague(leagueId));
  } catch (err) {
    next(err);
  }
});

wishlistRouter.put<WishlistParams>("/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const playerId = parseId(req.params.playerId);
    await requireLeague(leagueId);
    const input = updateWishlistEntrySchema.parse(req.body);
    const entry = await updateWishlistEntryNote(leagueId, playerId, input.note ?? null);
    if (!entry) {
      throw ApiError.notFound(`player ${playerId} not in wishlist for league ${leagueId}`);
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

wishlistRouter.delete<WishlistParams>("/:playerId", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const playerId = parseId(req.params.playerId);
    await requireLeague(leagueId);
    const removed = await deleteWishlistEntry(leagueId, playerId);
    if (!removed) {
      throw ApiError.notFound(`player ${playerId} not in wishlist for league ${leagueId}`);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
