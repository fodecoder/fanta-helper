import express, { Router } from "express";
import { importPlayersFromCsv, importPlayersFromXlsx } from "../import/playerImport";
import { listPlayers } from "../db/players";
import { ApiError } from "../http/errors";

export const playersRouter = Router();

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

playersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listPlayers());
  } catch (err) {
    next(err);
  }
});

playersRouter.post(
  "/import",
  express.raw({ type: XLSX_TYPES, limit: "10mb" }),
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  async (req, res, next) => {
    try {
      if (Buffer.isBuffer(req.body)) {
        if (req.body.length === 0) {
          throw ApiError.badRequest("empty xlsx body");
        }
        res.json(await importPlayersFromXlsx(req.body));
        return;
      }
      if (typeof req.body !== "string" || req.body.trim() === "") {
        throw ApiError.badRequest("empty CSV body");
      }
      res.json(await importPlayersFromCsv(req.body));
    } catch (err) {
      next(err);
    }
  },
);
