import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ROLES } from "@fanta-helper/shared";
import { authRouter } from "./routes/auth";
import { leaguesRouter } from "./routes/leagues";
import { playersRouter } from "./routes/players";
import { managersRouter } from "./routes/managers";
import { valuationsRouter } from "./routes/valuations";
import { recommendationsRouter } from "./routes/recommendations";
import { teamPrefsRouter } from "./routes/teamPrefs";
import { purchasesRouter } from "./routes/purchases";
import { rosterExchangeRouter } from "./routes/rosterExchange";
import { wishlistRouter } from "./routes/wishlist";
import { gkPairingRouter } from "./routes/gkPairing";
import { probableLineupRouter } from "./routes/probableLineup";
import { setPieceTakerRouter } from "./routes/setPieceTaker";
import { statsEnrichmentRouter } from "./routes/statsEnrichment";
import { playerSeasonStatsRouter } from "./routes/playerSeasonStats";
import { quotationRouter } from "./routes/quotation";
import { usersRouter } from "./routes/users";
import { chatRouter } from "./routes/chat";
import { errorHandler } from "./http/errorHandler";
import { requireAuth } from "./http/requireAuth";
import { requireWritableRole } from "./http/requireWritableRole";

export function createApp(): Express {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret) {
    throw new Error("COOKIE_SECRET is not set");
  }

  const app = express();

  // credentials: true richiede un'origine sempre esplicita (mai `*`), coerente
  // con l'uso di cookie di sessione cross-origin tra frontend e backend.
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser(cookieSecret));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", roles: ROLES });
  });

  app.use("/auth", authRouter);

  app.use(requireAuth);
  app.use(requireWritableRole);

  app.use("/users", usersRouter);
  app.use("/chat", chatRouter);
  app.use("/leagues", leaguesRouter);
  app.use("/leagues/:leagueId/managers", managersRouter);
  app.use("/leagues/:leagueId/valuations", valuationsRouter);
  app.use("/leagues/:leagueId/recommendations", recommendationsRouter);
  app.use("/leagues/:leagueId/team-prefs", teamPrefsRouter);
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
