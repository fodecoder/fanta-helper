import type { Request, Response, NextFunction } from "express";
import { getUserById } from "../db/users";
import { ApiError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Gli account `guest` possono solo consultare il portale (accesso di navigazione
// per terzi, es. il team SoFIFA). Ogni richiesta non-safe è 403. La lookup del
// ruolo avviene solo sui metodi di scrittura, rari.
export async function requireWritableRole(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  try {
    const user = req.userId ? await getUserById(req.userId) : undefined;
    if (user?.role === "guest") {
      next(ApiError.forbidden("account di sola consultazione"));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
