import type { PlayerLatestSeasonStatsResponse } from "@fanta-helper/shared";

function baseUrl(): string {
  return `${import.meta.env.VITE_API_URL}/players/season-stats`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class PlayerSeasonStatsApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new PlayerSeasonStatsApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function getLatestPlayerSeasonStats(
  playerIds: number[],
  signal?: AbortSignal,
): Promise<PlayerLatestSeasonStatsResponse> {
  const url = new URL(baseUrl());
  url.searchParams.set("ids", playerIds.join(","));
  return fetch(url, { signal }).then((res) => handle<PlayerLatestSeasonStatsResponse>(res));
}
