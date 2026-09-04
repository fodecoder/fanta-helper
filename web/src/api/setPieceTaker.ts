import type {
  SetPieceTakerEntry,
  SetPieceTakerImportReport,
  SetPieceTakerConfirmEntry,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = `${import.meta.env.VITE_API_URL}/set-piece-taker`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class SetPieceTakerApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new SetPieceTakerApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listSetPieceTakers(signal?: AbortSignal): Promise<SetPieceTakerEntry[]> {
  return apiFetch(BASE_URL, { signal }).then((res) => handle<SetPieceTakerEntry[]>(res));
}

export function confirmSetPieceTakers(
  team: string,
  rows: SetPieceTakerConfirmEntry[],
): Promise<SetPieceTakerImportReport> {
  return apiFetch(`${BASE_URL}/${encodeURIComponent(team)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  }).then((res) => handle<SetPieceTakerImportReport>(res));
}
