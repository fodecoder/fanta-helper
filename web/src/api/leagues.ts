import type { League, CreateLeagueInput, UpdateLeagueInput } from "@fanta-helper/shared";

const BASE_URL = `${import.meta.env.VITE_API_URL}/leagues`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class LeaguesApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new LeaguesApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function listLeagues(signal?: AbortSignal): Promise<League[]> {
  return fetch(BASE_URL, { signal }).then((res) => handle<League[]>(res));
}

export function getLeague(id: number, signal?: AbortSignal): Promise<League> {
  return fetch(`${BASE_URL}/${id}`, { signal }).then((res) => handle<League>(res));
}

export function createLeague(input: CreateLeagueInput): Promise<League> {
  return fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<League>(res));
}

export function updateLeague(id: number, input: UpdateLeagueInput): Promise<League> {
  return fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<League>(res));
}

export function deleteLeague(id: number): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, { method: "DELETE" }).then((res) => handle<void>(res));
}
