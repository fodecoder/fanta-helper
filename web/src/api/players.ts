import type { Player, PlayerImportReport } from "@fanta-helper/shared";

const BASE_URL = `${import.meta.env.VITE_API_URL}/players`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class PlayersApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new PlayersApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listPlayers(signal?: AbortSignal): Promise<Player[]> {
  return fetch(BASE_URL, { signal }).then((res) => handle<Player[]>(res));
}

export function importPlayersCsv(csvText: string): Promise<PlayerImportReport> {
  return fetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  }).then((res) => handle<PlayerImportReport>(res));
}
