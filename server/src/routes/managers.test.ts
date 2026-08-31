import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import * as leaguesDb from "../db/leagues";
import * as rostersDb from "../db/rosters";
import * as usersDb from "../db/users";
import { sessionCookie } from "../test/auth";
import type { ManagerRoster } from "@fanta-helper/shared";

vi.mock("../db/leagues");
vi.mock("../db/rosters");
vi.mock("../db/users");

const app = createApp();
const cookie = sessionCookie(1);

const league = { id: 1, name: "L" } as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(usersDb.getUserById).mockResolvedValue({ id: 1, role: "member" } as never);
});

describe("GET /leagues/:leagueId/managers/rosters", () => {
  it("404s when the league does not exist", async () => {
    vi.mocked(leaguesDb.getLeagueById).mockResolvedValue(undefined as never);
    await request(app).get("/leagues/1/managers/rosters").set("Cookie", cookie).expect(404);
    expect(rostersDb.getManagerRosters).not.toHaveBeenCalled();
  });

  it("400s on an invalid league id", async () => {
    await request(app).get("/leagues/abc/managers/rosters").set("Cookie", cookie).expect(400);
  });

  it("returns the per-manager rosters, including managers with no purchases", async () => {
    const rosters: ManagerRoster[] = [
      {
        managerId: 1,
        managerName: "Io",
        isOwner: true,
        players: [
          { player_id: 5, name: "Bomber", ruolo: "A", prezzo: 90, tier: "Top", tags: [] },
        ],
      },
      { managerId: 2, managerName: "Rivale", isOwner: false, players: [] },
    ];
    vi.mocked(leaguesDb.getLeagueById).mockResolvedValue(league);
    vi.mocked(rostersDb.getManagerRosters).mockResolvedValue(rosters);

    const res = await request(app).get("/leagues/1/managers/rosters").set("Cookie", cookie).expect(200);
    expect(res.body).toEqual(rosters);
    expect(rostersDb.getManagerRosters).toHaveBeenCalledWith(league);
  });
});
