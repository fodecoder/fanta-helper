import express, { Router } from "express";
import { importPlayersFromCsv } from "../import/playerCsv";
import { listPlayers } from "../db/players";
import { ApiError } from "../http/errors";

export const playersRouter = Router();

playersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listPlayers());
  } catch (err) {
    next(err);
  }
});

playersRouter.post(
  "/import",
  express.text({ type: ["text/csv", "text/plain"], limit: "2mb" }),
  async (req, res, next) => {
    try {
      if (typeof req.body !== "string" || req.body.trim() === "") {
        throw ApiError.badRequest("empty CSV body");
      }
      const report = await importPlayersFromCsv(req.body);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);
