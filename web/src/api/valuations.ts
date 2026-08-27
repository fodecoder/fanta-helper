import type {
  ValuationGenerationResponse,
  ValuationImportReport,
  ValuationRecord,
  ValuationUpsertInput,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/valuations`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class ValuationsApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ValuationsApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listValuations(
  leagueId: number,
  signal?: AbortSignal,
): Promise<ValuationWithPlayer[]> {
  return apiFetch(baseUrl(leagueId), { signal }).then((res) => handle<ValuationWithPlayer[]>(res));
}

export function importValuationsJson(
  leagueId: number,
  doc: unknown,
): Promise<ValuationImportReport> {
  return apiFetch(`${baseUrl(leagueId)}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  }).then((res) => handle<ValuationImportReport>(res));
}

export function generateValuations(
  leagueId: number,
  signal?: AbortSignal,
): Promise<ValuationGenerationResponse> {
  return apiFetch(`${baseUrl(leagueId)}/generate`, { method: "POST", signal }).then((res) =>
    handle<ValuationGenerationResponse>(res),
  );
}

export function upsertValuation(
  leagueId: number,
  playerId: number,
  input: ValuationUpsertInput,
): Promise<ValuationRecord> {
  return apiFetch(`${baseUrl(leagueId)}/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<ValuationRecord>(res));
}
