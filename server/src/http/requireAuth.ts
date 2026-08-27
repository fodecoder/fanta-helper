import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE } from "../auth/session";
import { ApiError } from "./errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.signedCookies[SESSION_COOKIE] as string | undefined;
  const userId = raw ? Number(raw) : NaN;
  if (!Number.isInteger(userId) || userId <= 0) {
    next(ApiError.unauthorized("authentication required"));
    return;
  }
  req.userId = userId;
  next();
}
