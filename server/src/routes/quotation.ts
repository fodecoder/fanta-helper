import { Router } from "express";
import { getLatestQuotationSeason, listQuotationsBySeason } from "../db/quotation";

export const quotationRouter = Router();

quotationRouter.get("/current", async (_req, res, next) => {
  try {
    const season = await getLatestQuotationSeason();
    res.json(season ? await listQuotationsBySeason(season) : []);
  } catch (err) {
    next(err);
  }
});
