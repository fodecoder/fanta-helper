import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import * as usersDb from "../db/users";
import * as password from "../auth/password";
import { sessionCookie } from "../test/auth";

vi.mock("../db/users");
vi.mock("../auth/password");

const app = createApp();
const memberRow = { id: 1, username: "Fra", password_hash: "h", avatar: null, avatar_color: null, role: "member" };
const guestRow = { ...memberRow, id: 2, username: "guest", role: "guest" as const };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /auth/login", () => {
  it("returns the public user on valid credentials", async () => {
    vi.mocked(usersDb.getUserByUsername).mockResolvedValue(memberRow as never);
    vi.mocked(password.verifyPassword).mockResolvedValue(true);

    const res = await request(app).post("/auth/login").send({ username: "Fra", password: "x" }).expect(200);
    expect(res.body).toEqual({ id: 1, username: "Fra", avatar: null, avatar_color: null, role: "member" });
    const setCookie = res.headers["set-cookie"] as unknown as string[];
    expect(setCookie[0]).toMatch(/session=/);
  });

  it("400s on a wrong password", async () => {
    vi.mocked(usersDb.getUserByUsername).mockResolvedValue(memberRow as never);
    vi.mocked(password.verifyPassword).mockResolvedValue(false);
    await request(app).post("/auth/login").send({ username: "Fra", password: "x" }).expect(400);
  });

  it("400s on an unknown user", async () => {
    vi.mocked(usersDb.getUserByUsername).mockResolvedValue(undefined);
    await request(app).post("/auth/login").send({ username: "Nope", password: "x" }).expect(400);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user", async () => {
    vi.mocked(usersDb.getUserById).mockResolvedValue(memberRow as never);
    const res = await request(app).get("/auth/me").set("Cookie", sessionCookie(1)).expect(200);
    expect(res.body.username).toBe("Fra");
  });

  it("401s without a cookie", async () => {
    await request(app).get("/auth/me").expect(401);
  });
});

describe("PATCH /auth/me", () => {
  it("403s for a guest account", async () => {
    vi.mocked(usersDb.getUserById).mockResolvedValue(guestRow as never);
    await request(app)
      .patch("/auth/me")
      .set("Cookie", sessionCookie(2))
      .send({ avatar: null, avatar_color: null })
      .expect(403);
    expect(usersDb.updateUserProfile).not.toHaveBeenCalled();
  });

  it("updates the profile for a member", async () => {
    vi.mocked(usersDb.getUserById).mockResolvedValue(memberRow as never);
    vi.mocked(usersDb.updateUserProfile).mockResolvedValue({ ...memberRow, avatar: "🦊" } as never);
    const res = await request(app)
      .patch("/auth/me")
      .set("Cookie", sessionCookie(1))
      .send({ avatar: "🦊", avatar_color: null })
      .expect(200);
    expect(res.body.avatar).toBe("🦊");
  });
});
