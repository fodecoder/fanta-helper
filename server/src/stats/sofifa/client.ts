import type { SofifaConfig } from "./config";
import { SOFIFA_REQUEST_HEADERS } from "./http";

export interface RemotePlayerAttributes {
  overall: number | null;
  potential: number | null;
  age: number | null;
  value: number | null;
}

// Shape of GET https://api.sofifa.net/player/{id} (public, no auth). Only the
// fields we surface are typed; everything else in the documented payload is
// ignored. Parsed defensively — any missing or non-numeric field collapses to
// null rather than a guessed value.
interface SofifaPlayerResponse {
  data?: {
    overallRating?: unknown;
    potential?: unknown;
    age?: unknown;
    // `price` is the EA FC market value in euros (e.g. 58500000).
    price?: unknown;
  };
}

function toIntOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

// Any network/HTTP/parsing failure resolves to `null` ("no data for this
// player"), never thrown — the base comparison must never degrade because of
// this optional call, and no attribute is ever invented.
export async function fetchPlayerAttributes(
  config: SofifaConfig,
  sofifaId: number,
): Promise<RemotePlayerAttributes | null> {
  try {
    const url = new URL(`/player/${sofifaId}`, config.baseUrl);
    const res = await fetch(url, { headers: SOFIFA_REQUEST_HEADERS });
    if (!res.ok) return null;

    const body = (await res.json()) as SofifaPlayerResponse;
    const data = body.data;
    if (!data) return null;

    return {
      overall: toIntOrNull(data.overallRating),
      potential: toIntOrNull(data.potential),
      age: toIntOrNull(data.age),
      value: toIntOrNull(data.price),
    };
  } catch {
    return null;
  }
}
