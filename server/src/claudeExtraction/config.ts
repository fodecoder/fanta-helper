export interface ClaudeExtractionConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_BASE_URL = "https://api.anthropic.com";

// A differenza di statsApi, qui non c'è un flag `enabled`: l'estrazione è
// l'ingest primario di questa feature, non un arricchimento opzionale. Senza
// chiave, il chiamante deve fallire in modo chiaro (503), non degradare a
// null.
export function getClaudeExtractionConfig(): ClaudeExtractionConfig {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? DEFAULT_BASE_URL,
  };
}
