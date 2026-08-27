import type { QuotationRow } from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = `${import.meta.env.VITE_API_URL}/players/quotations`;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class QuotationApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new QuotationApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listCurrentQuotations(signal?: AbortSignal): Promise<QuotationRow[]> {
  return apiFetch(`${BASE_URL}/current`, { signal }).then((res) => handle<QuotationRow[]>(res));
}
