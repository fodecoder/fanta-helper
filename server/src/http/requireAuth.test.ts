import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requireAuth } from "./requireAuth";
import { SESSION_COOKIE } from "../auth/session";
import { ApiError } from "./errors";

function run(signedCookies: Record<string, unknown>) {
  const req = { signedCookies } as unknown as Request;
  const next = vi.fn();
  requireAuth(req, {} as Response, next);
  return { req, next };
}

describe("requireAuth", () => {
  it("sets req.userId from a valid signed session cookie", () => {
    const { req, next } = run({ [SESSION_COOKIE]: "42" });
    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a missing cookie with 401", () => {
    const { next } = run({});
    const err = next.mock.calls[0]![0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
  });

  it("rejects a non-numeric / non-positive cookie value", () => {
    for (const bad of ["abc", "0", "-3"]) {
      const { next } = run({ [SESSION_COOKIE]: bad });
      expect((next.mock.calls[0]![0] as ApiError).status).toBe(401);
    }
  });
});
