import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import * as chatDb from "../db/chat";
import * as usersDb from "../db/users";
import { sessionCookie } from "../test/auth";

vi.mock("../db/chat");
vi.mock("../db/users");

const app = createApp();
const cookie = sessionCookie(1);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(usersDb.getUserById).mockResolvedValue({ id: 1, role: "member" } as never);
});

describe("GET /chat/inbox", () => {
  it("401s without auth", async () => {
    await request(app).get("/chat/inbox?since=2026-08-30T00:00:00.000Z").expect(401);
  });

  it("400s when `since` is missing or not an ISO datetime", async () => {
    await request(app).get("/chat/inbox").set("Cookie", cookie).expect(400);
    await request(app).get("/chat/inbox?since=2026-08-30").set("Cookie", cookie).expect(400);
  });

  it("returns the inbox rows for a valid `since`", async () => {
    const rows = [
      { id: 5, from_user: 2, to_user: 1, body: "ciao", created_at: "2026-08-30T10:00:00.000Z" },
    ];
    vi.mocked(chatDb.listInboxSince).mockResolvedValue(rows as never);

    const res = await request(app)
      .get("/chat/inbox?since=2026-08-30T09:00:00.000Z")
      .set("Cookie", cookie)
      .expect(200);

    expect(res.body).toEqual(rows);
    expect(chatDb.listInboxSince).toHaveBeenCalledWith(1, "2026-08-30T09:00:00.000Z");
  });
});
