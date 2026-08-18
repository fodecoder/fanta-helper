import { ApiError } from "../http/errors";
import type { ClaudeExtractionConfig } from "./config";

const ANTHROPIC_VERSION = "2023-06-01";

export type ImageMediaType = "image/png" | "image/jpeg";

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
}

function extractTextBlock(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const content = (body as MessagesResponse).content;
  if (!Array.isArray(content)) return null;
  const block = content.find((b) => b?.type === "text" && typeof b.text === "string");
  return typeof block?.text === "string" ? block.text : null;
}

// Modulo generico, senza conoscenza di dominio: il prompt e il parsing del
// JSON atteso vivono nei moduli import/*. Ogni fallimento di rete/parsing
// diventa un ApiError con messaggio generico — mai la chiave o il body
// upstream nel messaggio d'errore.
export async function requestVisionExtraction(
  config: ClaudeExtractionConfig,
  image: Buffer,
  mediaType: ImageMediaType,
  promptText: string,
): Promise<string> {
  if (config.apiKey === "") {
    throw new ApiError(
      503,
      "EXTRACTION_UNAVAILABLE",
      "estrazione da screenshot non configurata (ANTHROPIC_API_KEY assente)",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: image.toString("base64") },
              },
              { type: "text", text: promptText },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new ApiError(
      502,
      "EXTRACTION_UNAVAILABLE",
      "impossibile contattare il servizio di estrazione",
    );
  }

  if (!res.ok) {
    throw new ApiError(
      502,
      "EXTRACTION_UNAVAILABLE",
      `il servizio di estrazione ha risposto con errore (${res.status})`,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(
      502,
      "EXTRACTION_UNAVAILABLE",
      "risposta non valida dal servizio di estrazione",
    );
  }

  const text = extractTextBlock(body);
  if (text === null) {
    throw new ApiError(
      502,
      "EXTRACTION_UNAVAILABLE",
      "risposta senza contenuto testuale dal servizio di estrazione",
    );
  }
  return text;
}
