import { Router } from "express";
import { listSetPieceTakers, replaceSetPieceTakersForTeam } from "../db/setPieceTaker";
import { setPieceTakerConfirmRequestSchema } from "@fanta-helper/shared";

export const setPieceTakerRouter = Router();

setPieceTakerRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listSetPieceTakers());
  } catch (err) {
    next(err);
  }
});

// Sostituzione transazionale per una sola squadra: il client costruisce le
// righe (da JSON import o da editing manuale) e le manda già finalizzate.
setPieceTakerRouter.post("/:team/confirm", async (req, res, next) => {
  try {
    const team = req.params.team as string;
    const entries = setPieceTakerConfirmRequestSchema.parse(req.body);
    await replaceSetPieceTakersForTeam(team, entries);
    res.json({ team, entries: entries.length });
  } catch (err) {
    next(err);
  }
});
