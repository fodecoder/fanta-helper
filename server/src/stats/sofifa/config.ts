export interface SofifaConfig {
  enabled: boolean;
  apiToken: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://api.sofifa.net";

// Optional attribute enrichment (EA FC ratings), off unless explicitly turned
// on. A different data axis from API-Football performance stats — enabling one
// has no bearing on the other. The public /player/{id} endpoint needs no auth,
// so `enabled` gates only on the flag; `apiToken` stays optional and is only
// used for the customizedPlayers endpoints (not consumed here). Both providers
// are zero-cost when disabled.
export function getSofifaConfig(): SofifaConfig {
  const enabled = process.env.SOFIFA_ENABLED === "true";
  const apiToken = process.env.SOFIFA_API_TOKEN ?? "";
  const baseUrl = process.env.SOFIFA_BASE_URL ?? DEFAULT_BASE_URL;
  return { enabled, apiToken, baseUrl };
}
