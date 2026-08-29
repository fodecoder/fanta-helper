import { Router } from "express";
import { listOtherUsers } from "../db/users";
import { toPublicUser } from "../auth/publicUser";
import { ApiError } from "../http/errors";

export const usersRouter = Router();

usersRouter.get("/", async (req, res, next) => {
  try {
    if (!req.userId) {
      throw ApiError.unauthorized("authentication required");
    }
    const rows = await listOtherUsers(req.userId);
    res.json(rows.map(toPublicUser));
  } catch (err) {
    next(err);
  }
});
