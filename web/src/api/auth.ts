import type { User, LoginInput } from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = `${import.meta.env.VITE_API_URL}/auth`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class AuthApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new AuthApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function login(input: LoginInput): Promise<User> {
  return apiFetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<User>(res));
}

export function logout(): Promise<void> {
  return apiFetch(`${BASE_URL}/logout`, { method: "POST" }).then((res) => handle<void>(res));
}

export function me(signal?: AbortSignal): Promise<User> {
  return apiFetch(`${BASE_URL}/me`, { signal }).then((res) => handle<User>(res));
}
