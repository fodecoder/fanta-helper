export interface SofifaConfig {
  enabled: boolean;
  apiToken: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://api.sofifa.net";

// Optional attribute enrichment (EA FC ratings), off unless explicitly turned
// on. A different data axis from API-Football performance stats — enabling one
// has no bearing on the other. NOTE: api.sofifa.net is NOT a public API — it is
// whitelist-only, so every call 403s (→ no data, no regression) until SoFIFA
// whitelists the caller. `enabled` gates only on the flag; keep it off unless
// you have whitelisted access. `apiToken` is kept for a possible token-based
// scheme but is not currently sent (mechanism unspecified by SoFIFA). Both
// providers are zero-cost when disabled.
export function getSofifaConfig(): SofifaConfig {
  const enabled = process.env.SOFIFA_ENABLED === "true";
  const apiToken = process.env.SOFIFA_API_TOKEN ?? "";
  const baseUrl = process.env.SOFIFA_BASE_URL ?? DEFAULT_BASE_URL;
  return { enabled, apiToken, baseUrl };
}
