import type { PlayerStats, StatsEnrichmentResponse } from "@fanta-helper/shared";
import { getPlayerById } from "../db/players";
import { getStatsApiConfig } from "./config";
import { getCached, setCached } from "./cache";
import { tryConsume } from "./rateLimiter";
import { fetchPlayerStats, type RemotePlayerStats } from "./client";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// Serie A season spans Aug-May; API-Football labels it by the starting year.
function currentSeason(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  return month >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

async function resolveOne(
  playerId: number,
  season: number,
  config: ReturnType<typeof getStatsApiConfig>,
): Promise<PlayerStats | null> {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const cacheKey = `${playerId}:${season}`;
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
  return { player_id: playerId, minutes: remote.minutes, goals: remote.goals, assists: remote.assists };
}

export async function getStatsEnrichment(playerIds: number[]): Promise<StatsEnrichmentResponse> {
  const config = getStatsApiConfig();
  if (!config.enabled || playerIds.length === 0) {
    return { enabled: config.enabled, stats: [] };
  }

  const season = currentSeason();
  const results = await Promise.all(playerIds.map((id) => resolveOne(id, season, config)));

  return {
    enabled: true,
    stats: results.filter((r): r is PlayerStats => r !== null),
  };
}
