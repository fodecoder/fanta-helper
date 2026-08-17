import type { GoalkeeperGridEntry, GoalkeeperGridImportReport } from "@fanta-helper/shared";

const BASE_URL = `${import.meta.env.VITE_API_URL}/goalkeeper-grid`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class GoalkeeperGridApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new GoalkeeperGridApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listGoalkeeperGrid(signal?: AbortSignal): Promise<GoalkeeperGridEntry[]> {
  return fetch(BASE_URL, { signal }).then((res) => handle<GoalkeeperGridEntry[]>(res));
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function importGoalkeeperGridFile(file: File): Promise<GoalkeeperGridImportReport> {
  const isXlsx = /\.xlsx?$/i.test(file.name);
  const res = await fetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": isXlsx ? XLSX_MIME : "text/csv" },
    body: isXlsx ? await file.arrayBuffer() : await file.text(),
  });
  return handle<GoalkeeperGridImportReport>(res);
}
