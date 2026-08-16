import type { Manager, CreateManagerInput, UpdateManagerInput } from "@fanta-helper/shared";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/managers`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class ManagersApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ManagersApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function listManagers(leagueId: number, signal?: AbortSignal): Promise<Manager[]> {
  return fetch(baseUrl(leagueId), { signal }).then((res) => handle<Manager[]>(res));
}

export function createManager(leagueId: number, input: CreateManagerInput): Promise<Manager> {
  return fetch(baseUrl(leagueId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<Manager>(res));
}

export function updateManager(
  leagueId: number,
  id: number,
  input: UpdateManagerInput,
): Promise<Manager> {
  return fetch(`${baseUrl(leagueId)}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<Manager>(res));
}

export function deleteManager(leagueId: number, id: number): Promise<void> {
  return fetch(`${baseUrl(leagueId)}/${id}`, { method: "DELETE" }).then((res) => handle<void>(res));
}
