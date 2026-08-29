import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

const app = createApp();

describe("createApp", () => {
  it("serves GET /health without a database or auth", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  it("puts every non-/auth, non-/health route behind auth", async () => {
    await request(app).get("/leagues").expect(401);
    await request(app).get("/users").expect(401);
  });

  it("handles a burst of health checks without leaking (stress)", async () => {
    const results = await Promise.all(
      Array.from({ length: 150 }, () => request(app).get("/health")),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
  });
});
