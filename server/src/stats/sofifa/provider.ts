import type { PlayerAttributes } from "@fanta-helper/shared";
import type { PlayerRef, StatsProvider } from "../provider";
import { getCached, setCached } from "../cache";
import { getSofifaConfig } from "./config";
import { tryConsume } from "./rateLimiter";
import { fetchPlayerAttributes, type RemotePlayerAttributes } from "./client";

// Attributes change far less often than live performance; a longer TTL keeps
// the external call rare.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SOURCE = "SoFIFA";

async function resolveOne(
  player: PlayerRef,
  season: number,
  config: ReturnType<typeof getSofifaConfig>,
): Promise<PlayerAttributes | null> {
  const cacheKey = `sofifa:${player.id}:${season}`;
  const cached = getCached<RemotePlayerAttributes | null>(cacheKey);

  let remote: RemotePlayerAttributes | null;
  if (cached !== undefined) {
    remote = cached;
  } else if (tryConsume()) {
    remote = await fetchPlayerAttributes(config, { name: player.name, team: player.team, season });
    setCached(cacheKey, remote, CACHE_TTL_MS);
  } else {
    // Quota exhausted for today: skip without caching, so it's retried once
    // the daily budget resets rather than being locked in as "no data".
    remote = null;
  }

  if (!remote) return null;
  return {
    player_id: player.id,
    overall: remote.overall,
    potential: remote.potential,
    age: remote.age,
    value: remote.value,
  };
}

export const sofifaProvider: StatsProvider<PlayerAttributes> = {
  source: SOURCE,
  isEnabled() {
    return getSofifaConfig().enabled;
  },
  async enrich(players, season) {
    const config = getSofifaConfig();
    if (!config.enabled) return [];
    const results = await Promise.all(players.map((p) => resolveOne(p, season, config)));
    return results.filter((r): r is PlayerAttributes => r !== null);
  },
};
