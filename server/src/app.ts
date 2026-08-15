import express, { type Express } from "express";
import { ROLES } from "@fanta-helper/shared";

export function createApp(): Express {
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", roles: ROLES });
  });

  return app;
}
