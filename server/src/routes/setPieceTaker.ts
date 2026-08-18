import express, { Router } from "express";
import {
  listSetPieceTakers,
  replaceSetPieceTakersForTeam,
  upsertSetPieceTakerScreenshot,
  getSetPieceTakerScreenshot,
} from "../db/setPieceTaker";
import { extractSetPieceTakersFromImage } from "../import/setPieceTakerImport";
import { setPieceTakerConfirmRequestSchema } from "@fanta-helper/shared";
import { ApiError } from "../http/errors";

export const setPieceTakerRouter = Router();

const IMAGE_TYPES = ["image/png", "image/jpeg"];

setPieceTakerRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listSetPieceTakers());
  } catch (err) {
    next(err);
  }
});

// Step 1: upload screenshot -> bozza. Non scrive su set_piece_taker.
setPieceTakerRouter.post(
  "/:team/extract",
  express.raw({ type: IMAGE_TYPES, limit: "10mb" }),
  async (req, res, next) => {
    try {
      const team = req.params.team as string;
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw ApiError.badRequest("carica uno screenshot PNG o JPEG");
      }
      const contentType = req.get("Content-Type") === "image/jpeg" ? "image/jpeg" : "image/png";
      // Persistita indipendentemente dal successo dell'estrazione, così
      // resta consultabile/ri-estraibile anche se la chiamata a Claude
      // fallisce.
      await upsertSetPieceTakerScreenshot(team, req.body, contentType);
      const report = await extractSetPieceTakersFromImage(team, req.body, contentType);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

// Step 2: righe finalizzate dopo revisione -> replace transazionale per
// questa sola squadra.
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

setPieceTakerRouter.get("/:team/screenshot", async (req, res, next) => {
  try {
    const screenshot = await getSetPieceTakerScreenshot(req.params.team as string);
    if (!screenshot) throw ApiError.notFound("nessuno screenshot caricato per questa squadra");
    res.set("Content-Type", screenshot.content_type);
    res.send(screenshot.image);
  } catch (err) {
    next(err);
  }
});
