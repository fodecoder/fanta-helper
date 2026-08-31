import type { Player, PlayerImportReport } from "@fanta-helper/shared";
import { apiFetch } from "./http";

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
  return apiFetch(BASE_URL, { signal }).then((res) => handle<Player[]>(res));
}

export function importPlayersCsv(csvText: string): Promise<PlayerImportReport> {
  return apiFetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  }).then((res) => handle<PlayerImportReport>(res));
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Accetta sia CSV sia xlsx: il tipo si deduce dall'estensione del file e il
// backend distingue in base al Content-Type (testo vs binario). Il nome file
// viaggia in X-Filename: per un xlsx quotazioni permette al backend di
// ricavare la stagione (es. Quotazioni_Fantacalcio_Stagione_2025_26.xlsx).
// `season` serve solo al listone posizionale (CSV "Lista FantaAsta" senza
// header, da cui la stagione non è ricavabile): viaggia in X-Season.
export async function importPlayersFile(file: File, season?: string): Promise<PlayerImportReport> {
  const isXlsx = /\.xlsx?$/i.test(file.name);
  const headers: Record<string, string> = {
    "Content-Type": isXlsx ? XLSX_MIME : "text/csv",
    "X-Filename": file.name,
  };
  if (season && season.trim() !== "") headers["X-Season"] = season.trim();
  const res = await apiFetch(`${BASE_URL}/import`, {
    method: "POST",
    headers,
    body: isXlsx ? await file.arrayBuffer() : await file.text(),
  });
  return handle<PlayerImportReport>(res);
}
