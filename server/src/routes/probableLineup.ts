import { Router } from "express";
import { listProbableLineup, replaceProbableLineupForTeam } from "../db/probableLineup";
import { probableLineupConfirmRequestSchema } from "@fanta-helper/shared";

export const probableLineupRouter = Router();

probableLineupRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listProbableLineup());
  } catch (err) {
    next(err);
  }
});

// Sostituzione transazionale per una sola squadra: il client costruisce le
// righe (da JSON import o da editing manuale) e le manda già finalizzate.
probableLineupRouter.post("/:team/confirm", async (req, res, next) => {
  try {
    const team = req.params.team as string;
    const entries = probableLineupConfirmRequestSchema.parse(req.body);
    await replaceProbableLineupForTeam(team, entries);
    res.json({ team, entries: entries.length });
  } catch (err) {
    next(err);
  }
});
