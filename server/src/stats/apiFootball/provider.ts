import type { PlayerStats } from "@fanta-helper/shared";
import type { PlayerRef, StatsProvider } from "../provider";
import { getCached, setCached } from "../cache";
import { getApiFootballConfig } from "./config";
import { tryConsume } from "./rateLimiter";
import { fetchPlayerStats, type RemotePlayerStats } from "./client";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SOURCE = "API-Football";

async function resolveOne(
  player: PlayerRef,
  season: number,
  config: ReturnType<typeof getApiFootballConfig>,
): Promise<PlayerStats | null> {
  const cacheKey = `apiFootball:${player.id}:${season}`;
  const cached = getCached<RemotePlayerStats | null>(cacheKey);

  let remote: RemotePlayerStats | null;
  if (cached !== undefined) {
    remote = cached;
  } else if (tryConsume()) {
    remote = await fetchPlayerStats(config, { name: player.name, team: player.team, season });
    setCached(cacheKey, remote, CACHE_TTL_MS);
  } else {
    // Quota exhausted for today: skip without caching, so it's retried once
    // the daily budget resets rather than being locked in as "no data".
    remote = null;
  }

  if (!remote) return null;
  return { player_id: player.id, minutes: remote.minutes, goals: remote.goals, assists: remote.assists };
}

export const apiFootballProvider: StatsProvider<PlayerStats> = {
  source: SOURCE,
  isEnabled() {
    return getApiFootballConfig().enabled;
  },
  async enrich(players, season) {
    const config = getApiFootballConfig();
    if (!config.enabled) return [];
    const results = await Promise.all(players.map((p) => resolveOne(p, season, config)));
    return results.filter((r): r is PlayerStats => r !== null);
  },
};
