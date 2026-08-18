import type {
  ProbableLineupEntry,
  ProbableLineupExtractionResponse,
  ProbableLineupImportReport,
  ProbableLineupConfirmEntry,
} from "@fanta-helper/shared";

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
  return fetch(BASE_URL, { signal }).then((res) => handle<ProbableLineupEntry[]>(res));
}

export async function extractProbableLineup(
  team: string,
  file: File,
): Promise<ProbableLineupExtractionResponse> {
  const contentType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(team)}/extract`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: await file.arrayBuffer(),
  });
  return handle<ProbableLineupExtractionResponse>(res);
}

export function confirmProbableLineup(
  team: string,
  rows: ProbableLineupConfirmEntry[],
): Promise<ProbableLineupImportReport> {
  return fetch(`${BASE_URL}/${encodeURIComponent(team)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  }).then((res) => handle<ProbableLineupImportReport>(res));
}

export function screenshotUrl(team: string): string {
  return `${BASE_URL}/${encodeURIComponent(team)}/screenshot`;
}
