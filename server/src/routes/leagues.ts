import { Router } from "express";
import { createLeagueSchema, updateLeagueSchema } from "@fanta-helper/shared";
import {
  listLeagues,
  getLeagueById,
  insertLeague,
  updateLeague,
  deleteLeague,
} from "../db/leagues";
import { insertManager } from "../db/managers";
import { pickFunnyNames, OWNER_MANAGER_NAME } from "../managers/funnyNames";
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
    // Alla creazione la lega ha già i suoi partecipanti: il proprietario ("Io")
    // più n-1 avversari con nomi generati. Restano modificabili dalla gestione
    // manager; qui è solo un default per non partire da una lega vuota.
    await insertManager({ league_id: league.id, name: OWNER_MANAGER_NAME });
    for (const name of pickFunnyNames(Math.max(0, league.n_squadre - 1))) {
      await insertManager({ league_id: league.id, name });
    }
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
