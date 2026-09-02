import express, { Router } from "express";
import { importListoneFromCsv } from "../import/listoneImport";
import { importPlayersAndQuotationsFromXlsx } from "../import/currentSeasonImport";
import { listActivePlayers, PruneConfirmationRequired } from "../db/players";
import { ApiError } from "../http/errors";

export const playersRouter = Router();

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

playersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listActivePlayers());
  } catch (err) {
    next(err);
  }
});

playersRouter.post(
  "/import",
  express.raw({ type: XLSX_TYPES, limit: "10mb" }),
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  async (req, res, next) => {
    const confirmed = req.get("X-Confirm-Prune") === "1";
    try {
      if (Buffer.isBuffer(req.body)) {
        if (req.body.length === 0) {
          throw ApiError.badRequest("empty xlsx body");
        }
        const filename = req.get("X-Filename") ?? null;
        res.json(await importPlayersAndQuotationsFromXlsx(req.body, filename, confirmed));
        return;
      }
      if (typeof req.body !== "string" || req.body.trim() === "") {
        throw ApiError.badRequest("empty CSV body");
      }
      res.json(await importListoneFromCsv(req.body, req.get("X-Season") ?? null, confirmed));
    } catch (err) {
      if (err instanceof PruneConfirmationRequired) {
        next(
          new ApiError(409, "PRUNE_CONFIRMATION_REQUIRED", err.message, undefined, {
            pendingDeactivation: err.pendingDeactivation,
            totalActive: err.totalActive,
            sample: err.sample,
          }),
        );
        return;
      }
      next(err);
    }
  },
);
