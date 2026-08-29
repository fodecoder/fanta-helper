import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { requireWritableRole } from "./requireWritableRole";
import { ApiError } from "./errors";
import * as users from "../db/users";

vi.mock("../db/users");

function req(method: string, userId?: number) {
  return { method, userId } as unknown as Request;
}

beforeEach(() => vi.resetAllMocks());

describe("requireWritableRole", () => {
  it("lets safe methods through without a role lookup", async () => {
    const next = vi.fn();
    await requireWritableRole(req("GET", 1), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(users.getUserById).not.toHaveBeenCalled();
  });

  it("blocks a write from a guest with 403", async () => {
    vi.mocked(users.getUserById).mockResolvedValue({ id: 1, role: "guest" } as never);
    const next = vi.fn();
    await requireWritableRole(req("POST", 1), {} as Response, next);
    const err = next.mock.calls[0]![0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
  });

  it("allows a write from a member", async () => {
    vi.mocked(users.getUserById).mockResolvedValue({ id: 1, role: "member" } as never);
    const next = vi.fn();
    await requireWritableRole(req("DELETE", 1), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});
