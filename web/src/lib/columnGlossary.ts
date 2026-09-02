// Glossario unico delle sigle di colonna non ovvie, riusato da Consigli,
// Panoramica e tabella confronto asta. `tooltip` è la sintesi leggibile
// mostrata su hover; le colonne calcolate hanno anche un modale «Dettagli».

export interface ColumnInfo {
  label: string;
  tooltip: string;
}

export const COLUMN_GLOSSARY = {
  score: {
    label: "Punteggio",
    tooltip:
      "Scala 0–10 per ruolo (0 = da evitare, 10 = da prendere): percentile dello score VORP nel pool di ruolo. Lo score grezzo è nei Dettagli.",
  },
  tier: {
    label: "Fascia",
    tooltip:
      "Bucket di percentile dello score entro il ruolo: Top ≥ 90°, Solido ≥ 65°, Utile ≥ 35°, Basso sotto.",
  },
  leagueAdjustedFm: {
    label: "Fm regolata",
    tooltip:
      "Fantamedia ricostruita sulle regole di lega: mv − 6.0 + bonus/malus per presenza + bonus difesa + bonus portiere.",
  },
  reliability: {
    label: "Affidabilità",
    tooltip:
      "Quota di presenze sulla stagione, oppure il peso dello stato in formazione probabile se più alto.",
  },
  fm: {
    label: "Fm scorsa stagione",
    tooltip: "Fantamedia importata dell'ultima stagione: voto medio con bonus/malus reali.",
  },
  qtA: { label: "Qt.A", tooltip: "Quotazione attuale di listino, in crediti." },
  qtI: { label: "Qt.I", tooltip: "Quotazione iniziale di listino, in crediti." },
  fvm: {
    label: "FVM",
    tooltip:
      "Fantavalore di mercato: indice di prezzo di listino, riscalato al budget di lega (base listino 500 crediti).",
  },
  vorp: {
    label: "VORP",
    tooltip:
      "Value Over Replacement Player: valore del giocatore sopra il rimpiazzo marginale del suo ruolo.",
  },
  adjustedMaxBid: {
    label: "Max bid rett.",
    tooltip:
      "Massima offerta sostenibile: residuo − 1 credito riservato per ogni altro slot ancora da riempire.",
  },
  vsFv: {
    label: "vs FV",
    tooltip: "Differenza tra prezzo pagato e fair value stimato.",
  },
} as const satisfies Record<string, ColumnInfo>;
