import { DEFAULT_BUDGET } from "./league";

// Le valutazioni (JSON import o generazione LLM, vedi valuation.ts) sono
// sempre espresse su una base di 1000 crediti, indipendentemente dal budget
// reale della lega: è il valore SALVATO, invariato. Ogni vista che le mostra
// applica questo fattore a lettura (budget-lega / 1000), così una lega da
// 500 o 1500 crediti vede target/fair_value/max_bid/panic_price riscalati
// senza mai riscrivere il dato importato — coerente con "valuation è
// per-lega ma RELATIVA alla lega", non un nuovo stato mutabile.
export function valuationScaleFactor(leagueBudget: number): number {
  return leagueBudget / DEFAULT_BUDGET;
}

// L'FVM (Fantavalore di Mercato) del listino è pubblicato su base 500 crediti,
// NON 1000 come le valutazioni sopra: è la convenzione ufficiale del listino
// Fantacalcio. Quando è mostrato in Vista Asta come proxy di prezzo assoluto va
// quindi riscalato al budget reale della lega con questo fattore (budget / 500).
// Base distinta da DEFAULT_BUDGET proprio perché la sorgente è diversa.
export const FVM_BASE_BUDGET = 500;

export function fvmScaleFactor(leagueBudget: number): number {
  return leagueBudget / FVM_BASE_BUDGET;
}

export function scaleFvm(fvm: number, factor: number): number {
  return Math.round(fvm * factor);
}

// La percentuale è solo un modo di inserimento del max bid: il valore
// persistito resta in crediti. Arrotondamento esplicito con Math.round.
export function budgetPercentToCredits(percent: number, leagueBudget: number): number {
  return Math.round((percent / 100) * leagueBudget);
}
export function creditsToBudgetPercent(credits: number, leagueBudget: number): number {
  return (credits / leagueBudget) * 100;
}

export interface ScalableValuationAmounts {
  target: number;
  fair_value: number;
  max_bid: number;
  panic_price: number;
}

export function scaleValuationAmounts<T extends ScalableValuationAmounts>(
  valuation: T,
  factor: number,
): T {
  if (factor === 1) return valuation;
  return {
    ...valuation,
    target: Math.round(valuation.target * factor),
    fair_value: Math.round(valuation.fair_value * factor),
    max_bid: Math.round(valuation.max_bid * factor),
    panic_price: Math.round(valuation.panic_price * factor),
  };
}
