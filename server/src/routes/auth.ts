import { Router } from "express";
import { loginSchema, updateProfileSchema } from "@fanta-helper/shared";
import { getUserByUsername, getUserById, updateUserProfile } from "../db/users";
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

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const existing = await getUserById(req.userId!);
    if (existing?.role === "guest") {
      throw ApiError.forbidden("account di sola consultazione");
    }
    const user = await updateUserProfile(req.userId!, input);
    if (!user) {
      throw ApiError.unauthorized("not authenticated");
    }
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});
