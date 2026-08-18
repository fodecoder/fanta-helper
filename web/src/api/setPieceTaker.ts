import type {
  SetPieceTakerEntry,
  SetPieceTakerExtractionResponse,
  SetPieceTakerImportReport,
  SetPieceTakerConfirmEntry,
} from "@fanta-helper/shared";

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
  return fetch(BASE_URL, { signal }).then((res) => handle<SetPieceTakerEntry[]>(res));
}

export async function extractSetPieceTakers(
  team: string,
  file: File,
): Promise<SetPieceTakerExtractionResponse> {
  const contentType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(team)}/extract`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: await file.arrayBuffer(),
  });
  return handle<SetPieceTakerExtractionResponse>(res);
}

export function confirmSetPieceTakers(
  team: string,
  rows: SetPieceTakerConfirmEntry[],
): Promise<SetPieceTakerImportReport> {
  return fetch(`${BASE_URL}/${encodeURIComponent(team)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  }).then((res) => handle<SetPieceTakerImportReport>(res));
}

export function screenshotUrl(team: string): string {
  return `${BASE_URL}/${encodeURIComponent(team)}/screenshot`;
}
