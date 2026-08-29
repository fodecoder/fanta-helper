import type { StatsEnrichmentResponse } from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(): string {
  return `${import.meta.env.VITE_API_URL}/players/stats-enrichment`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class StatsEnrichmentApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new StatsEnrichmentApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function getStatsEnrichment(
  playerIds: number[],
  signal?: AbortSignal,
): Promise<StatsEnrichmentResponse> {
  const qs = new URLSearchParams({ ids: playerIds.join(",") });
  return apiFetch(`${baseUrl()}?${qs.toString()}`, { signal }).then((res) =>
    handle<StatsEnrichmentResponse>(res),
  );
}
