import { Router } from "express";
import { z } from "zod";
import { listLatestPlayerSeasonStatsWithPresenze } from "../db/playerSeasonStats";
import { ApiError } from "../http/errors";

export const playerSeasonStatsRouter = Router();

const idsQuerySchema = z.object({
  ids: z
    .string()
    .min(1)
    .transform((raw) => raw.split(",").map((part) => part.trim()))
    .pipe(z.array(z.string().regex(/^\d+$/, "id must be a positive integer")).max(50))
    .transform((parts) => parts.map(Number)),
});

playerSeasonStatsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = idsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest("invalid ids query param", { ids: [parsed.error.message] });
    }
    res.json(await listLatestPlayerSeasonStatsWithPresenze(parsed.data.ids));
  } catch (err) {
    next(err);
  }
});
