import express, { type Express } from "express";
import cors from "cors";
import { ROLES } from "@fanta-helper/shared";

export function createApp(): Express {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", roles: ROLES });
  });

  return app;
}
