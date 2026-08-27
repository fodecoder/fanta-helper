import { Router } from "express";
import { loginSchema } from "@fanta-helper/shared";
import { getUserByUsername, getUserById } from "../db/users";
import { verifyPassword } from "../auth/password";
import { setSessionCookie, clearSessionCookie } from "../auth/session";
import { toPublicUser } from "../auth/publicUser";
import { requireAuth } from "../http/requireAuth";
import { ApiError } from "../http/errors";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await getUserByUsername(input.username);
    const ok = user ? await verifyPassword(input.password, user.password_hash) : false;
    if (!user || !ok) {
      throw ApiError.badRequest("invalid username or password");
    }
    setSessionCookie(res, user.id);
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      throw ApiError.unauthorized("not authenticated");
    }
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});
