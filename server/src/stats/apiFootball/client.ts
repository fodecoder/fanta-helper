import type { ApiFootballConfig } from "./config";
import { isSamePlayer } from "../matchPlayer";

export interface RemotePlayerStats {
  minutes: number | null;
  goals: number | null;
  assists: number | null;
}

interface ApiFootballPlayersResponse {
  response: Array<{
    player: { name: string };
    statistics: Array<{
      team: { name: string };
      games: { minutes: number | null };
      goals: { total: number | null; assists: number | null };
    }>;
  }>;
}

// Any network/HTTP/parsing failure or absent match resolves to `null`
// ("no data for this player"), never thrown — the base comparison must
// never degrade because of this optional call.
export async function fetchPlayerStats(
  config: ApiFootballConfig,
  target: { name: string; team: string; season: number },
): Promise<RemotePlayerStats | null> {
  try {
    const url = new URL("/players", config.baseUrl);
    url.searchParams.set("search", target.name);
    url.searchParams.set("season", String(target.season));

    const res = await fetch(url, {
      headers: { "x-apisports-key": config.apiKey },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ApiFootballPlayersResponse;
    for (const entry of body.response) {
      for (const stat of entry.statistics) {
        if (isSamePlayer({ name: entry.player.name, team: stat.team.name }, target)) {
          return {
            minutes: stat.games.minutes,
            goals: stat.goals.total,
            assists: stat.goals.assists,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
