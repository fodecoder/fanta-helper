import type { SofifaConfig } from "./config";
import { isSamePlayer } from "../matchPlayer";

export interface RemotePlayerAttributes {
  overall: number | null;
  potential: number | null;
  age: number | null;
  value: number | null;
}

// SoFIFA's contract is not publicly documented and requires an account token;
// the response is parsed defensively. The shape below is the expected search
// payload — any field that is missing or non-numeric collapses to null rather
// than a guessed value. `SOFIFA_BASE_URL` lets a deployment point at the exact
// endpoint its token is provisioned for without a code change.
interface SofifaSearchResponse {
  results?: Array<{
    name?: unknown;
    team?: unknown;
    overall?: unknown;
    potential?: unknown;
    age?: unknown;
    value?: unknown;
  }>;
}

function toIntOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Any network/HTTP/parsing failure or absent match resolves to `null`
// ("no data for this player"), never thrown — the base comparison must never
// degrade because of this optional call, and no attribute is ever invented.
export async function fetchPlayerAttributes(
  config: SofifaConfig,
  target: { name: string; team: string; season: number },
): Promise<RemotePlayerAttributes | null> {
  try {
    const url = new URL("/api/players", config.baseUrl);
    url.searchParams.set("q", target.name);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as SofifaSearchResponse;
    for (const entry of body.results ?? []) {
      const candidate = { name: toStringOrEmpty(entry.name), team: toStringOrEmpty(entry.team) };
      if (candidate.name !== "" && isSamePlayer(candidate, target)) {
        return {
          overall: toIntOrNull(entry.overall),
          potential: toIntOrNull(entry.potential),
          age: toIntOrNull(entry.age),
          value: toIntOrNull(entry.value),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
