import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import * as leaguesDb from "../db/leagues";
import * as usersDb from "../db/users";
import { sessionCookie } from "../test/auth";

vi.mock("../db/leagues");
vi.mock("../db/users");

const app = createApp();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(usersDb.getUserById).mockResolvedValue({ id: 1, role: "member" } as never);
});

describe("DELETE /leagues/:id", () => {
  it("401s without a session cookie", async () => {
    await request(app).delete("/leagues/1").expect(401);
    expect(leaguesDb.deleteLeague).not.toHaveBeenCalled();
  });

  it("204s when the league existed", async () => {
    vi.mocked(leaguesDb.deleteLeague).mockResolvedValue(true);
    await request(app).delete("/leagues/7").set("Cookie", sessionCookie(1)).expect(204);
    expect(leaguesDb.deleteLeague).toHaveBeenCalledWith(7);
  });

  it("404s when the league did not exist", async () => {
    vi.mocked(leaguesDb.deleteLeague).mockResolvedValue(false);
    await request(app).delete("/leagues/9").set("Cookie", sessionCookie(1)).expect(404);
  });

  it("400s on an invalid id", async () => {
    await request(app).delete("/leagues/abc").set("Cookie", sessionCookie(1)).expect(400);
  });

  it("403s for a guest account", async () => {
    vi.mocked(usersDb.getUserById).mockResolvedValue({ id: 2, role: "guest" } as never);
    await request(app).delete("/leagues/7").set("Cookie", sessionCookie(2)).expect(403);
    expect(leaguesDb.deleteLeague).not.toHaveBeenCalled();
  });
});
