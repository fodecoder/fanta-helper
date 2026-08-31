import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/trap-tags`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class PlayerTrapTagsApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function fail(res: Response): Promise<never> {
  throw new PlayerTrapTagsApiError(res.status, (await res.json()) as ApiErrorPayload);
}

export async function listPlayerTrapTags(
  leagueId: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const res = await apiFetch(baseUrl(leagueId), { signal });
  if (!res.ok) return fail(res);
  return (await res.json()) as number[];
}

export async function addPlayerTrapTag(leagueId: number, playerId: number): Promise<void> {
  const res = await apiFetch(baseUrl(leagueId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId }),
  });
  if (!res.ok) await fail(res);
}

export async function removePlayerTrapTag(leagueId: number, playerId: number): Promise<void> {
  const res = await apiFetch(`${baseUrl(leagueId)}/${playerId}`, { method: "DELETE" });
  if (!res.ok) await fail(res);
}
