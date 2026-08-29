import { Router } from "express";
import { sendMessageSchema } from "@fanta-helper/shared";
import { getUserById } from "../db/users";
import { insertMessage, listConversation } from "../db/chat";
import { ApiError } from "../http/errors";

export const chatRouter = Router();

function requireUserId(req: { userId?: number }): number {
  if (!req.userId) {
    throw ApiError.unauthorized("authentication required");
  }
  return req.userId;
}

function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`invalid id: ${String(raw)}`);
  }
  return id;
}

chatRouter.get("/", async (req, res, next) => {
  try {
    const me = requireUserId(req);
    const withId = parseId(req.query.with);
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === "string" && sinceRaw.length > 0 ? sinceRaw : undefined;
    const other = await getUserById(withId);
    if (!other) {
      throw ApiError.notFound(`user ${withId} not found`);
    }
    res.json(await listConversation(me, withId, since));
  } catch (err) {
    next(err);
  }
});

chatRouter.post("/", async (req, res, next) => {
  try {
    const me = requireUserId(req);
    const input = sendMessageSchema.parse(req.body);
    if (input.to === me) {
      throw ApiError.badRequest("cannot send a message to yourself");
    }
    const other = await getUserById(input.to);
    if (!other) {
      throw ApiError.notFound(`user ${input.to} not found`);
    }
    res.status(201).json(await insertMessage(me, input.to, input.body));
  } catch (err) {
    next(err);
  }
});
