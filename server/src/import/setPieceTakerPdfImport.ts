import { z } from "zod";
import { setPieceTakerTipoSchema } from "@fanta-helper/shared";
import type { DiscardedExtractionRow } from "@fanta-helper/shared";
import { getClaudeExtractionConfig } from "../claudeExtraction/config";
import { requestTextExtraction, stripCodeFence } from "../claudeExtraction/client";
import { ApiError } from "../http/errors";

// Schema locale al server: a differenza degli altri schemi di estrazione in
// shared/, questo non ha alcun consumer lato web (solo lo script di seed lo
// legge), quindi non serve condividerlo.
const pdfSetPieceTakerRowSchema = z.object({
  team: z.string().min(1),
  tipo: setPieceTakerTipoSchema,
  player_name: z.string().min(1),
  rank: z.number().int().min(1),
  uncertain: z.boolean(),
  reason: z.string().optional(),
});
export type PdfSetPieceTakerRow = z.infer<typeof pdfSetPieceTakerRowSchema>;

function buildPrompt(fullText: string): string {
  return `Il testo seguente è stato estratto da un PDF (stampa di una pagina
web) che elenca, per ogni squadra di Serie A, i tiratori di rigori e di calci
piazzati in ordine di gerarchia. L'estrazione testuale contiene rumore da
ignorare: marcatori di fine pagina nella forma "-- N of M --", intestazioni
di navigazione del sito ripetute, e almeno un blocco pubblicitario inserito a
metà documento (es. "Hear Clear IT... apparecchi acustici") che interrompe la
lista di una squadra — il testo prosegue subito dopo con la squadra
successiva o la sezione interrotta. Alcune squadre hanno più di 3 tiratori in
gerarchia: non troncare né forzare esattamente 3 righe. Dopo l'ultima squadra
il testo contiene navigazione/footer del sito: ignoralo.

Per ogni squadra ci sono due sezioni: "Rigori" (tipo "rigore") e "Calci
piazzati" (tipo "punizione"). Non esiste alcun dato sui calci d'angolo in
questo documento: non generare mai una riga con tipo "corner".

Restituisci SOLO un array JSON, senza testo aggiuntivo né markdown, con un
oggetto per ogni tiratore leggibile, in questa forma esatta:
[{"team": string, "tipo": "rigore"|"punizione", "player_name": string, "rank": number, "uncertain": boolean, "reason": string}]
Regole tassative:
- "rank" è la posizione in gerarchia (1 = primo tiratore, 2 = secondo, ...).
- "reason" è presente solo se "uncertain" è true, e spiega perché.
- Non inventare squadre, nomi, tipi o gerarchie: se una riga non è leggibile
  con sufficiente sicurezza, includila comunque ma con "uncertain": true e un
  "reason" chiaro, così chi revisiona può correggerla o scartarla.

Testo estratto dal PDF:
"""
${fullText}
"""`;
}

export interface PdfSetPieceTakerExtractionResult {
  rows: PdfSetPieceTakerRow[];
  discarded: DiscardedExtractionRow[];
}

// Un'unica chiamata testuale sull'intero documento (~600 righe, ben dentro i
// limiti di contesto/output): niente split per-squadra lato codice, fragile
// viste le irregolarità del testo estratto — il raggruppamento per team è
// demandato al modello, stesso pattern "JSON + zod safeParse per riga +
// scarto" di setPieceTakerImport.ts.
export async function extractSetPieceTakersFromPdfText(
  fullText: string,
): Promise<PdfSetPieceTakerExtractionResult> {
  const config = getClaudeExtractionConfig();
  const rawText = await requestTextExtraction(config, buildPrompt(fullText), 8000);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
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

  const rows: PdfSetPieceTakerRow[] = [];
  const discarded: DiscardedExtractionRow[] = [];
  parsed.forEach((raw, index) => {
    const result = pdfSetPieceTakerRowSchema.safeParse(raw);
    if (result.success) {
      rows.push(result.data);
    } else {
      discarded.push({
        index,
        reason: `riga non interpretabile: ${result.error.issues.map((i) => i.message).join("; ")}`,
      });
    }
  });

  return { rows, discarded };
}
