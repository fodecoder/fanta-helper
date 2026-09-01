import type {
  CreatePurchaseInput,
  ManagerAuctionStatus,
  Purchase,
  PurchaseWithDetails,
} from "@fanta-helper/shared";
import { apiFetch } from "./http";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/purchases`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class PurchasesApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new PurchasesApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listPurchases(
  leagueId: number,
  signal?: AbortSignal,
): Promise<PurchaseWithDetails[]> {
  return apiFetch(baseUrl(leagueId), { signal }).then((res) => handle<PurchaseWithDetails[]>(res));
}

export function getAuctionState(
  leagueId: number,
  signal?: AbortSignal,
): Promise<ManagerAuctionStatus[]> {
  return apiFetch(`${baseUrl(leagueId)}/state`, { signal }).then((res) =>
    handle<ManagerAuctionStatus[]>(res),
  );
}

export function createPurchase(leagueId: number, input: CreatePurchaseInput): Promise<Purchase> {
  return apiFetch(baseUrl(leagueId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<Purchase>(res));
}

export function deleteLastPurchase(leagueId: number): Promise<Purchase> {
  return apiFetch(`${baseUrl(leagueId)}/last`, { method: "DELETE" }).then((res) =>
    handle<Purchase>(res),
  );
}

export function deletePurchase(leagueId: number, playerId: number): Promise<Purchase> {
  return apiFetch(`${baseUrl(leagueId)}/${playerId}`, { method: "DELETE" }).then((res) =>
    handle<Purchase>(res),
  );
}
