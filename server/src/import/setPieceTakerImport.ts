import type { SetPieceTakerExtractionResponse, SetPieceTakerDraftRow } from "@fanta-helper/shared";
import { setPieceTakerDraftRowSchema } from "@fanta-helper/shared";
import { getClaudeExtractionConfig } from "../claudeExtraction/config";
import {
  requestVisionExtraction,
  stripCodeFence,
  type ImageMediaType,
} from "../claudeExtraction/client";
import { ApiError } from "../http/errors";

function buildPrompt(team: string): string {
  return `Analizza lo screenshot allegato: mostra la gerarchia editoriale dei
tiratori di calci piazzati (rigori, punizioni, corner) della squadra
"${team}" (fonte tipo Gazzetta/SosFanta/FantaCalcioPedia).
Restituisci SOLO un array JSON, senza testo aggiuntivo né markdown, con un
oggetto per ogni tiratore leggibile, in questa forma esatta:
[{"tipo": "rigore"|"punizione"|"corner", "player_name": string, "rank": number, "uncertain": boolean, "reason": string}]
Regole tassative:
- "tipo" deve essere esattamente uno dei tre valori indicati.
- "rank" è la posizione in gerarchia (1 = primo tiratore, 2 = secondo, ...).
- "reason" è presente solo se "uncertain" è true, e spiega perché.
- Non inventare nomi, tipi o gerarchie: se una riga non è leggibile con
  sufficiente sicurezza, includila comunque ma con "uncertain": true e un
  "reason" chiaro, così l'utente può correggerla o scartarla in fase di
  revisione.`;
}

export async function extractSetPieceTakersFromImage(
  team: string,
  image: Buffer,
  mediaType: ImageMediaType,
): Promise<SetPieceTakerExtractionResponse> {
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

  const rows: SetPieceTakerDraftRow[] = [];
  const discarded: { index: number; reason: string }[] = [];
  parsed.forEach((raw, index) => {
    const result = setPieceTakerDraftRowSchema.safeParse(raw);
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
