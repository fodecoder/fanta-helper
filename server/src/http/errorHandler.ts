import type { ErrorRequestHandler } from "express";
import { ZodError, flattenError } from "zod";
import { ApiError, isUniqueViolation } from "./errors";

// Express only treats a middleware as error-handling when the function has
// arity 4 (checked via fn.length at runtime), so `next` must stay declared.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, fields: err.fields, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "invalid payload",
        fields: flattenError(err).fieldErrors,
      },
    });
    return;
  }
  if (isUniqueViolation(err)) {
    const constraint = (err as { constraint?: string }).constraint;
    const message =
      constraint === "manager_league_name_uk"
        ? "a manager with this name already exists in this league"
        : constraint === "app_user_username_uk"
          ? "a user with this username already exists"
          : constraint === "purchase_pkey"
            ? "this player has already been purchased in this league"
            : constraint === "wishlist_pkey"
              ? "this player is already in the wishlist for this league"
              : constraint === "probable_lineup_team_player_uk"
                ? "this player appears more than once in the confirmed lineup for this team"
                : constraint === "set_piece_taker_team_tipo_rank_uk"
                  ? "this rank is already assigned to another player for this team and set piece type"
                  : constraint === "gk_pairing_team_pair_uk"
                    ? "this team pair is already recorded in the pairing matrix"
                    : constraint === "league_name_key"
                      ? "a league with this name already exists"
                      : `unique constraint violated${constraint ? `: ${constraint}` : ""}`;
    res.status(409).json({ error: { code: "CONFLICT", message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "unexpected server error" } });
};
