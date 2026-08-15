import express, { Router } from "express";
import { importPlayersFromCsv } from "../import/playerCsv";
import { ApiError } from "../http/errors";

export const playersRouter = Router();

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
