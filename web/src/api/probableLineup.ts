import type {
  ProbableLineupEntry,
  ProbableLineupImportReport,
  ProbableLineupConfirmEntry,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = `${import.meta.env.VITE_API_URL}/probable-lineup`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class ProbableLineupApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ProbableLineupApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listProbableLineup(signal?: AbortSignal): Promise<ProbableLineupEntry[]> {
  return apiFetch(BASE_URL, { signal }).then((res) => handle<ProbableLineupEntry[]>(res));
}

export function confirmProbableLineup(
  team: string,
  rows: ProbableLineupConfirmEntry[],
): Promise<ProbableLineupImportReport> {
  return apiFetch(`${BASE_URL}/${encodeURIComponent(team)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  }).then((res) => handle<ProbableLineupImportReport>(res));
}
