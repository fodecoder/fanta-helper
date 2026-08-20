export interface SofifaConfig {
  enabled: boolean;
  apiToken: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://sofifa.com";

// Optional attribute enrichment (EA FC ratings), off unless explicitly turned
// on with a token. A different data axis from API-Football performance stats —
// enabling one has no bearing on the other. Token stays backend-only; the
// client never sees it. Both providers are zero-cost when disabled.
export function getSofifaConfig(): SofifaConfig {
  const enabled = process.env.SOFIFA_ENABLED === "true";
  const apiToken = process.env.SOFIFA_API_TOKEN ?? "";
  const baseUrl = process.env.SOFIFA_BASE_URL ?? DEFAULT_BASE_URL;
  return { enabled: enabled && apiToken !== "", apiToken, baseUrl };
}
