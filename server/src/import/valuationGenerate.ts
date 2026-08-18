import type { Role, ValuationGenerationResponse, DiscardedExtractionRow } from "@fanta-helper/shared";
import { ROLES, valuationEntrySchema, unmatchedValuationSchema } from "@fanta-helper/shared";
import { getClaudeExtractionConfig } from "../claudeExtraction/config";
import { requestTextExtraction } from "../claudeExtraction/client";
import { listPlayers, findPlayersByNameTeam } from "../db/players";
import type { LeagueRow, PlayerRow } from "../db/types";
import { ApiError } from "../http/errors";

// Un chunk per-ruolo può comunque contenere centinaia di giocatori (es.
// difensori/centrocampisti): si sotto-divide in batch fissi per restare
// entro MAX_TOKENS indipendentemente dalla dimensione del listone.
const BATCH_SIZE = 40;
const MAX_TOKENS = 8192;

// Schema della riga richiesta al modello: il ruolo non viene chiesto (è già
// noto dal batch) e viene iniettato dopo il parsing, prima della validazione
// finale contro valuationEntrySchema.
const draftEntrySchema = valuationEntrySchema.omit({ ruolo: true });

function buildPrompt(
  league: LeagueRow,
  ruolo: Role,
  players: { name: string; team: string }[],
): string {
  return `Sei un assistente che prepara le valutazioni pre-asta per un fantacalcio
a budget con aste live, secondo le regole della lega indicata sotto.

Regole della lega (JSON):
scoring = ${JSON.stringify(league.scoring)}
modificatori = ${JSON.stringify(league.modificatori)}
roster_config = ${JSON.stringify(league.roster_config)}
budget = ${league.budget}
n_squadre = ${league.n_squadre}

Valuta ESCLUSIVAMENTE questi giocatori di ruolo "${ruolo}" (non aggiungerne
altri, non ometterne, uno per ogni elemento elencato):
${JSON.stringify(players)}

Restituisci SOLO un array JSON, senza testo aggiuntivo né markdown, con un
oggetto per ogni giocatore elencato, in questa forma esatta:
[{"name": string, "team": string, "tier": string, "target": integer >= 0, "fair_value": integer >= 0, "max_bid": integer >= 0, "panic_price": integer >= 0, "confidence": "low"|"medium"|"high", "note": string|null}]
Regole tassative:
- "name" e "team" devono corrispondere esattamente a quelli elencati sopra.
- "confidence" riflette quanto sei sicuro della valutazione, non inventarla a caso.
- Non inventare giocatori che non sono nell'elenco.`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1]! : trimmed;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export async function generateValuationsForLeague(
  league: LeagueRow,
): Promise<ValuationGenerationResponse> {
  const config = getClaudeExtractionConfig();
  const allPlayers = await listPlayers();

  const matched: ValuationGenerationResponse["matched"] = [];
  const unmatched: ValuationGenerationResponse["unmatched"] = [];
  const discarded: DiscardedExtractionRow[] = [];
  let globalIndex = 0;

  for (const ruolo of ROLES) {
    const rolePlayers = allPlayers.filter((p: PlayerRow) => p.ruolo === ruolo);
    for (const batch of chunk(rolePlayers, BATCH_SIZE)) {
      const prompt = buildPrompt(
        league,
        ruolo,
        batch.map((p) => ({ name: p.name, team: p.team })),
      );
      const rawText = await requestTextExtraction(config, prompt, MAX_TOKENS);

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripCodeFence(rawText));
      } catch {
        throw new ApiError(
          502,
          "EXTRACTION_PARSE_FAILED",
          `il servizio di estrazione non ha restituito un JSON valido (ruolo ${ruolo})`,
        );
      }
      if (!Array.isArray(parsed)) {
        throw new ApiError(
          502,
          "EXTRACTION_PARSE_FAILED",
          `risposta di estrazione in formato inatteso (ruolo ${ruolo}, attesa una lista)`,
        );
      }

      for (const raw of parsed) {
        const index = globalIndex++;
        const draftResult = draftEntrySchema.safeParse(raw);
        if (!draftResult.success) {
          discarded.push({
            index,
            reason: `ruolo ${ruolo}: riga non interpretabile: ${draftResult.error.issues.map((i) => i.message).join("; ")}`,
          });
          continue;
        }
        const entryResult = valuationEntrySchema.safeParse({ ...draftResult.data, ruolo });
        if (!entryResult.success) {
          discarded.push({
            index,
            reason: `ruolo ${ruolo}: riga non valida: ${entryResult.error.issues.map((i) => i.message).join("; ")}`,
          });
          continue;
        }
        const entry = entryResult.data;

        const candidates = await findPlayersByNameTeam(entry.name, entry.team);
        if (candidates.length === 1) {
          matched.push({ ...entry, player_id: candidates[0]!.id });
        } else {
          const reason =
            candidates.length === 0
              ? "nessun giocatore trovato per nome+squadra"
              : `match ambiguo: ${candidates.length} giocatori trovati`;
          unmatched.push(unmatchedValuationSchema.parse({ ...entry, reason }));
        }
      }
    }
  }

  return { matched, unmatched, discarded };
}
