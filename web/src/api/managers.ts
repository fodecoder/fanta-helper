import type {
  Manager,
  ManagerRoster,
  CreateManagerInput,
  UpdateManagerInput,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

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
  return apiFetch(baseUrl(leagueId), { signal }).then((res) => handle<Manager[]>(res));
}

export function listManagerRosters(
  leagueId: number,
  signal?: AbortSignal,
): Promise<ManagerRoster[]> {
  return apiFetch(`${baseUrl(leagueId)}/rosters`, { signal }).then((res) =>
    handle<ManagerRoster[]>(res),
  );
}

export function createManager(leagueId: number, input: CreateManagerInput): Promise<Manager> {
  return apiFetch(baseUrl(leagueId), {
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
  return apiFetch(`${baseUrl(leagueId)}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<Manager>(res));
}

export function deleteManager(leagueId: number, id: number): Promise<void> {
  return apiFetch(`${baseUrl(leagueId)}/${id}`, { method: "DELETE" }).then((res) => handle<void>(res));
}
