import type { GkPairingEntry, GkPairingImportReport } from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = `${import.meta.env.VITE_API_URL}/gk-pairing`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class GkPairingApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new GkPairingApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listGkPairing(signal?: AbortSignal): Promise<GkPairingEntry[]> {
  return apiFetch(BASE_URL, { signal }).then((res) => handle<GkPairingEntry[]>(res));
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function importGkPairingFile(file: File): Promise<GkPairingImportReport> {
  const isXlsx = /\.xlsx?$/i.test(file.name);
  const res = await apiFetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": isXlsx ? XLSX_MIME : "text/csv" },
    body: isXlsx ? await file.arrayBuffer() : await file.text(),
  });
  return handle<GkPairingImportReport>(res);
}
