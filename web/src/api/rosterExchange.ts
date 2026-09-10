import type {
  RosterExportResult,
  RosterImportCommitRequest,
  RosterImportPreviewResult,
  RosterImportReport,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/roster-exchange`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class RosterExchangeApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new RosterExchangeApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function exportRoster(leagueId: number, signal?: AbortSignal): Promise<RosterExportResult> {
  return apiFetch(`${baseUrl(leagueId)}/export`, { signal }).then((res) =>
    handle<RosterExportResult>(res),
  );
}

export function previewRosterImportCsv(
  leagueId: number,
  csvText: string,
): Promise<RosterImportPreviewResult> {
  return apiFetch(`${baseUrl(leagueId)}/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  }).then((res) => handle<RosterImportPreviewResult>(res));
}

export function commitRosterImport(
  leagueId: number,
  body: RosterImportCommitRequest,
): Promise<RosterImportReport> {
  return apiFetch(`${baseUrl(leagueId)}/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => handle<RosterImportReport>(res));
}
