import { Router } from "express";
import { createLeagueSchema, updateLeagueSchema } from "@fanta-helper/shared";
import {
  listLeagues,
  getLeagueById,
  insertLeague,
  updateLeague,
  deleteLeague,
} from "../db/leagues";
import { ApiError } from "../http/errors";

export const leaguesRouter = Router();

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid league id: ${raw}`);
  }
  return id;
}

leaguesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listLeagues());
  } catch (err) {
    next(err);
  }
});

leaguesRouter.get("/:id", async (req, res, next) => {
  try {
    const league = await getLeagueById(parseId(req.params.id));
    if (!league) {
      throw ApiError.notFound(`league ${req.params.id} not found`);
    }
    res.json(league);
  } catch (err) {
    next(err);
  }
});

leaguesRouter.post("/", async (req, res, next) => {
  try {
    const input = createLeagueSchema.parse(req.body);
    const league = await insertLeague(input);
    res.status(201).json(league);
  } catch (err) {
    next(err);
  }
});

leaguesRouter.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const input = updateLeagueSchema.parse(req.body);
    const league = await updateLeague(id, input);
    if (!league) {
      throw ApiError.notFound(`league ${id} not found`);
    }
    res.json(league);
  } catch (err) {
    next(err);
  }
});

leaguesRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const deleted = await deleteLeague(id);
    if (!deleted) {
      throw ApiError.notFound(`league ${id} not found`);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
