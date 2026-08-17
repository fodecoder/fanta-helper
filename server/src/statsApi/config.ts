export interface StatsApiConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";

// Optional enrichment, off unless explicitly turned on with a key — the base
// same-role comparison must never depend on this.
export function getStatsApiConfig(): StatsApiConfig {
  const enabled = process.env.STATS_API_ENABLED === "true";
  const apiKey = process.env.STATS_API_KEY ?? "";
  const baseUrl = process.env.STATS_API_BASE_URL ?? DEFAULT_BASE_URL;
  return { enabled: enabled && apiKey !== "", apiKey, baseUrl };
}
