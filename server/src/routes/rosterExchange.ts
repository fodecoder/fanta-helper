import express, { Router } from "express";
import { getLeagueById } from "../db/leagues";
import { buildRosterExportCsv } from "../import/rosterExport";
import { importRosterFromCsv } from "../import/rosterImport";
import { ApiError } from "../http/errors";

export const rosterExchangeRouter = Router({ mergeParams: true });

interface LeagueParams {
  leagueId: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${raw}`);
  }
  return id;
}

rosterExchangeRouter.get<LeagueParams>("/export", async (req, res, next) => {
  try {
    const leagueId = parseId(req.params.leagueId);
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw ApiError.notFound(`league ${leagueId} not found`);
    }
    res.json(await buildRosterExportCsv(leagueId));
  } catch (err) {
    next(err);
  }
});

rosterExchangeRouter.post<LeagueParams>(
  "/import",
  express.text({ type: ["text/csv", "text/plain"], limit: "2mb" }),
  async (req, res, next) => {
    try {
      const leagueId = parseId(req.params.leagueId);
      const league = await getLeagueById(leagueId);
      if (!league) {
        throw ApiError.notFound(`league ${leagueId} not found`);
      }
      if (typeof req.body !== "string" || req.body.trim() === "") {
        throw ApiError.badRequest("empty CSV body");
      }
      res.json(await importRosterFromCsv(leagueId, req.body));
    } catch (err) {
      next(err);
    }
  },
);
