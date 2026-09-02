import type {
  ValuationGenerationResponse,
  ValuationImportReport,
  ValuationOverridePatch,
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

// Genera e persiste un listino di base (motore deterministico, senza Claude)
// a copertura totale del pool. Utile per iniziare a modificare le valutazioni
// quando non si ha un JSON pronto.
export function generateDefaultValuations(leagueId: number): Promise<ValuationImportReport> {
  return apiFetch(`${baseUrl(leagueId)}/generate-default`, { method: "POST" }).then((res) =>
    handle<ValuationImportReport>(res),
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

// Override personale (per-utente) di uno o più campi del listino. Patch
// sparso: le chiavi assenti restano invariate, un valore `null` azzera il
// singolo campo. Se l'override resta senza campi, il server lo rimuove.
export function upsertValuationOverride(
  leagueId: number,
  playerId: number,
  patch: ValuationOverridePatch,
): Promise<unknown> {
  return apiFetch(`${baseUrl(leagueId)}/overrides/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).then((res) => handle<unknown>(res));
}

export async function resetValuationOverride(leagueId: number, playerId: number): Promise<void> {
  const res = await apiFetch(`${baseUrl(leagueId)}/overrides/${playerId}`, { method: "DELETE" });
  if (!res.ok) {
    await handle<void>(res);
  }
}
