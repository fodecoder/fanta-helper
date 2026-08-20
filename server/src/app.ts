import express, { type Express } from "express";
import cors from "cors";
import { ROLES } from "@fanta-helper/shared";
import { leaguesRouter } from "./routes/leagues";
import { playersRouter } from "./routes/players";
import { managersRouter } from "./routes/managers";
import { valuationsRouter } from "./routes/valuations";
import { recommendationsRouter } from "./routes/recommendations";
import { purchasesRouter } from "./routes/purchases";
import { rosterExchangeRouter } from "./routes/rosterExchange";
import { wishlistRouter } from "./routes/wishlist";
import { gkPairingRouter } from "./routes/gkPairing";
import { probableLineupRouter } from "./routes/probableLineup";
import { setPieceTakerRouter } from "./routes/setPieceTaker";
import { statsEnrichmentRouter } from "./routes/statsEnrichment";
import { playerSeasonStatsRouter } from "./routes/playerSeasonStats";
import { quotationRouter } from "./routes/quotation";
import { errorHandler } from "./http/errorHandler";

export function createApp(): Express {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", roles: ROLES });
  });

  app.use("/leagues", leaguesRouter);
  app.use("/leagues/:leagueId/managers", managersRouter);
  app.use("/leagues/:leagueId/valuations", valuationsRouter);
  app.use("/leagues/:leagueId/recommendations", recommendationsRouter);
  app.use("/leagues/:leagueId/purchases", purchasesRouter);
  app.use("/leagues/:leagueId/roster-exchange", rosterExchangeRouter);
  app.use("/leagues/:leagueId/wishlist", wishlistRouter);
  app.use("/players/stats-enrichment", statsEnrichmentRouter);
  app.use("/players/season-stats", playerSeasonStatsRouter);
  app.use("/players/quotations", quotationRouter);
  app.use("/players", playersRouter);
  app.use("/gk-pairing", gkPairingRouter);
  app.use("/probable-lineup", probableLineupRouter);
  app.use("/set-piece-taker", setPieceTakerRouter);

  app.use(errorHandler);

  return app;
}
