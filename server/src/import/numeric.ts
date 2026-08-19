// Tollerante col formato dei listoni ufficiali: cella vuota o "-" è un
// null legittimo (es. Qt.I assente per un giocatore appena promosso), non
// un errore. Qualsiasi altro valore non numerico è invece uno scarto: non
// si inventa un dato al posto di uno illeggibile.
export type NumericParseResult = { ok: true; value: number | null } | { ok: false };

const NULLABLE_TOKENS = new Set(["", "-"]);

export function parseNullableInt(raw: string): NumericParseResult {
  const trimmed = raw.trim();
  if (NULLABLE_TOKENS.has(trimmed)) return { ok: true, value: null };
  if (!/^-?\d+$/.test(trimmed)) return { ok: false };
  return { ok: true, value: Number.parseInt(trimmed, 10) };
}

// Statistiche (Mv/Fm) usano il separatore decimale italiano nei listoni.
export function parseNullableDecimal(raw: string): NumericParseResult {
  const trimmed = raw.trim();
  if (NULLABLE_TOKENS.has(trimmed)) return { ok: true, value: null };
  const normalized = trimmed.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { ok: false };
  return { ok: true, value: Number.parseFloat(normalized) };
}
