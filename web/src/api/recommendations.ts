import type { PlayerRecommendationWithTags } from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/recommendations`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class RecommendationsApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new RecommendationsApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listRecommendations(
  leagueId: number,
  signal?: AbortSignal,
): Promise<PlayerRecommendationWithTags[]> {
  return apiFetch(baseUrl(leagueId), { signal }).then((res) =>
    handle<PlayerRecommendationWithTags[]>(res),
  );
}
