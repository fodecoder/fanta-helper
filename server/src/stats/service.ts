import type {
  PlayerAttributes,
  PlayerStats,
  ProviderEnrichment,
  StatsEnrichmentResponse,
} from "@fanta-helper/shared";
import { getPlayerById } from "../db/players";
import type { PlayerRef, StatsProvider } from "./provider";
import { apiFootballProvider } from "./apiFootball/provider";
import { sofifaProvider } from "./sofifa/provider";

// Serie A season spans Aug-May; API-Football labels it by the starting year.
function currentSeason(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  return month >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

async function resolveRefs(playerIds: number[]): Promise<PlayerRef[]> {
  const players = await Promise.all(playerIds.map((id) => getPlayerById(id)));
  return players
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({ id: p.id, name: p.name, team: p.team }));
}

async function section<T extends { player_id: number }>(
  provider: StatsProvider<T>,
  refs: PlayerRef[],
  season: number,
): Promise<ProviderEnrichment<T>> {
  if (!provider.isEnabled()) {
    return { enabled: false, source: null, stats: [] };
  }
  const stats = await provider.enrich(refs, season);
  return { enabled: true, source: provider.source, stats };
}

// Aggregates every optional provider behind one call. Each provider is gated
// independently: a disabled provider contributes an empty, `enabled:false`
// section and costs nothing. The base comparison never depends on any of this.
export async function getStatsEnrichment(playerIds: number[]): Promise<StatsEnrichmentResponse> {
  const performanceOn = apiFootballProvider.isEnabled();
  const attributesOn = sofifaProvider.isEnabled();

  if ((!performanceOn && !attributesOn) || playerIds.length === 0) {
    return {
      performance: { enabled: performanceOn, source: null, stats: [] },
      attributes: { enabled: attributesOn, source: null, stats: [] },
    };
  }

  const season = currentSeason();
  const refs = await resolveRefs(playerIds);

  const [performance, attributes] = await Promise.all([
    section<PlayerStats>(apiFootballProvider, refs, season),
    section<PlayerAttributes>(sofifaProvider, refs, season),
  ]);

  return { performance, attributes };
}
