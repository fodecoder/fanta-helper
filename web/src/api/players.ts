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

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Accetta sia CSV sia xlsx: il tipo si deduce dall'estensione del file e il
// backend distingue in base al Content-Type (testo vs binario).
export async function importPlayersFile(file: File): Promise<PlayerImportReport> {
  const isXlsx = /\.xlsx?$/i.test(file.name);
  const res = await fetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": isXlsx ? XLSX_MIME : "text/csv" },
    body: isXlsx ? await file.arrayBuffer() : await file.text(),
  });
  return handle<PlayerImportReport>(res);
}
