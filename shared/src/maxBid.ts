import type { ManagerAuctionStatus } from "./purchase";

// Credito minimo per assegnare un giocatore: è la riserva minima che
// garantisce di poter comunque completare la rosa dopo l'acquisto corrente.
export const MIN_SLOT_RESERVE = 1;

/**
 * Max bid rettificato = residuo meno la riserva minima per gli slot liberi
 * che restano da riempire dopo l'acquisto corrente (opportunity cost).
 *
 * `freeSlotsTotal - 1` esclude lo slot che l'acquisto in corso sta per
 * riempire, qualunque sia il reparto. Se la rosa è già completa il risultato
 * è 0.
 *
 * Limiti: il floor è uniforme su tutti i reparti e non riflette differenze
 * di prezzo reali tra ruoli (es. attaccanti vs portieri); non considera
 * l'inflazione di mercato residua né il comportamento degli altri manager.
 * Formula volutamente semplice, deterministica e spiegabile.
 */
export function computeAdjustedMaxBid(
  status: Pick<ManagerAuctionStatus, "residuo" | "slots">,
): number {
  const freeSlotsTotal = status.slots.reduce((sum, slot) => sum + Math.max(slot.free, 0), 0);
  if (freeSlotsTotal <= 0) return 0;

  const reserve = (freeSlotsTotal - 1) * MIN_SLOT_RESERVE;
  return Math.max(0, status.residuo - reserve);
}
