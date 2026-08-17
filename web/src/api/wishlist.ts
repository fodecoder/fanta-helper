import type { WishlistEntryWithPlayer } from "@fanta-helper/shared";

function baseUrl(leagueId: number): string {
  return `${import.meta.env.VITE_API_URL}/leagues/${leagueId}/wishlist`;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class WishlistApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new WishlistApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  return (await res.json()) as T;
}

export function listWishlist(
  leagueId: number,
  signal?: AbortSignal,
): Promise<WishlistEntryWithPlayer[]> {
  return fetch(baseUrl(leagueId), { signal }).then((res) => handle<WishlistEntryWithPlayer[]>(res));
}

export function addToWishlist(leagueId: number, playerId: number): Promise<WishlistEntryWithPlayer> {
  return fetch(baseUrl(leagueId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId }),
  }).then((res) => handle<WishlistEntryWithPlayer>(res));
}

export async function removeFromWishlist(leagueId: number, playerId: number): Promise<void> {
  const res = await fetch(`${baseUrl(leagueId)}/${playerId}`, { method: "DELETE" });
  if (!res.ok) {
    throw new WishlistApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
}

export function reorderWishlist(
  leagueId: number,
  playerIds: number[],
): Promise<WishlistEntryWithPlayer[]> {
  return fetch(`${baseUrl(leagueId)}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_ids: playerIds }),
  }).then((res) => handle<WishlistEntryWithPlayer[]>(res));
}
