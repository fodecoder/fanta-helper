import express, { Router } from "express";
import { listGoalkeeperGrid, replaceGoalkeeperGrid } from "../db/goalkeeperGrid";
import { goalkeeperGridFromCsv, goalkeeperGridFromXlsx } from "../import/goalkeeperGridImport";
import { ApiError } from "../http/errors";

export const goalkeeperGridRouter = Router();

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

goalkeeperGridRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listGoalkeeperGrid());
  } catch (err) {
    next(err);
  }
});

goalkeeperGridRouter.post(
  "/import",
  express.raw({ type: XLSX_TYPES, limit: "10mb" }),
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  async (req, res, next) => {
    try {
      let parsed;
      if (Buffer.isBuffer(req.body)) {
        if (req.body.length === 0) throw ApiError.badRequest("empty xlsx body");
        parsed = goalkeeperGridFromXlsx(req.body);
      } else if (typeof req.body === "string" && req.body.trim() !== "") {
        parsed = goalkeeperGridFromCsv(req.body);
      } else {
        throw ApiError.badRequest("empty import body");
      }
      await replaceGoalkeeperGrid(parsed.entries);
      res.json(parsed.report);
    } catch (err) {
      next(err);
    }
  },
);
