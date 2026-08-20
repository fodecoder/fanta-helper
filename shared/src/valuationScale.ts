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
