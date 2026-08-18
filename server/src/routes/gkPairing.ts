import express, { Router } from "express";
import { listGkPairing, replaceGkPairing } from "../db/gkPairing";
import { gkPairingFromCsv, gkPairingFromXlsx } from "../import/gkPairingImport";
import { ApiError } from "../http/errors";

export const gkPairingRouter = Router();

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

gkPairingRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listGkPairing());
  } catch (err) {
    next(err);
  }
});

gkPairingRouter.post(
  "/import",
  express.raw({ type: XLSX_TYPES, limit: "10mb" }),
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  async (req, res, next) => {
    try {
      let parsed;
      if (Buffer.isBuffer(req.body)) {
        if (req.body.length === 0) throw ApiError.badRequest("empty xlsx body");
        parsed = gkPairingFromXlsx(req.body);
      } else if (typeof req.body === "string" && req.body.trim() !== "") {
        parsed = gkPairingFromCsv(req.body);
      } else {
        throw ApiError.badRequest("empty import body");
      }
      await replaceGkPairing(parsed.entries);
      res.json(parsed.report);
    } catch (err) {
      next(err);
    }
  },
);
