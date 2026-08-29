import type { TeamPref, TeamPrefKind } from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/team-prefs`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class TeamPrefsApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new TeamPrefsApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listTeamPrefs(leagueId: number, signal?: AbortSignal): Promise<TeamPref[]> {
  return apiFetch(baseUrl(leagueId), { signal }).then((res) => handle<TeamPref[]>(res));
}

export function upsertTeamPref(
  leagueId: number,
  team: string,
  kind: TeamPrefKind,
): Promise<TeamPref> {
  return apiFetch(baseUrl(leagueId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team, kind }),
  }).then((res) => handle<TeamPref>(res));
}

export async function deleteTeamPref(leagueId: number, team: string): Promise<void> {
  const res = await apiFetch(`${baseUrl(leagueId)}/${encodeURIComponent(team)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    await handle<void>(res);
  }
}
