import type { ProbableLineupExtractionResponse, ProbableLineupDraftRow } from "@fanta-helper/shared";
import { probableLineupDraftRowSchema } from "@fanta-helper/shared";
import { getClaudeExtractionConfig } from "../claudeExtraction/config";
import { requestVisionExtraction, type ImageMediaType } from "../claudeExtraction/client";
import { ApiError } from "../http/errors";

function buildPrompt(team: string): string {
  return `Analizza lo screenshot allegato: mostra la probabile formazione editoriale
della squadra "${team}" (fonte tipo Gazzetta/SosFanta/FantaCalcioPedia).
Restituisci SOLO un array JSON, senza testo aggiuntivo né markdown, con un
oggetto per ogni giocatore leggibile, in questa forma esatta:
[{"player_name": string, "ruolo": string|null, "stato": "titolare"|"panchina"|"ballottaggio", "uncertain": boolean, "reason": string}]
Regole tassative:
- "stato" deve essere esattamente uno dei tre valori indicati.
- "reason" è presente solo se "uncertain" è true, e spiega perché.
- "ruolo" è il ruolo (es. P, D, C, A) se visibile nello screenshot, altrimenti null.
- Non inventare nomi o stati: se una riga non è leggibile con sufficiente
  sicurezza, includila comunque ma con "uncertain": true e un "reason"
  chiaro, così l'utente può correggerla o scartarla in fase di revisione.`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1]! : trimmed;
}

export async function extractProbableLineupFromImage(
  team: string,
  image: Buffer,
  mediaType: ImageMediaType,
): Promise<ProbableLineupExtractionResponse> {
  const config = getClaudeExtractionConfig();
  const rawText = await requestVisionExtraction(config, image, mediaType, buildPrompt(team));

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    // Output del modello non interpretabile come JSON: non c'è nulla da
    // salvare come riga "da rivedere" (non abbiamo righe), quindi si segnala
    // un errore chiaro invece di inventare una struttura.
    throw new ApiError(
      502,
      "EXTRACTION_PARSE_FAILED",
      "il servizio di estrazione non ha restituito un JSON valido",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new ApiError(
      502,
      "EXTRACTION_PARSE_FAILED",
      "risposta di estrazione in formato inatteso (attesa una lista)",
    );
  }

  const rows: ProbableLineupDraftRow[] = [];
  const discarded: { index: number; reason: string }[] = [];
  parsed.forEach((raw, index) => {
    const result = probableLineupDraftRowSchema.safeParse(raw);
    if (result.success) {
      rows.push(result.data);
    } else {
      discarded.push({
        index,
        reason: `riga non interpretabile: ${result.error.issues.map((i) => i.message).join("; ")}`,
      });
    }
  });

  return { team, rows, discarded };
}
