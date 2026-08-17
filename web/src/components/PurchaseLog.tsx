import { useState } from "react";
import type { PurchaseWithDetails } from "@fanta-helper/shared";
import * as purchasesApi from "../api/purchases";
import { PurchasesApiError } from "../api/purchases";

interface PurchaseLogProps {
  leagueId: number;
  purchases: PurchaseWithDetails[] | null;
  loadError: string | null;
  onUndone: () => void;
}

export function PurchaseLog({ leagueId, purchases, loadError, onUndone }: PurchaseLogProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);

  async function handleUndoLast() {
    if (!purchases || purchases.length === 0) return;
    const last = purchases[purchases.length - 1];
    if (!last) return;
    const confirmed = window.confirm(
      `Annullare l'ultimo acquisto (${last.player_name} → ${last.manager_name}, ${last.prezzo})?`,
    );
    if (!confirmed) return;
    setUndoing(true);
    try {
      await purchasesApi.deleteLastPurchase(leagueId);
      setActionError(null);
      onUndone();
    } catch (err) {
      setActionError(
        err instanceof PurchasesApiError ? err.payload.error.message : "annullamento fallito",
      );
    } finally {
      setUndoing(false);
    }
  }

  return (
    <section>
      <header>
        <h2>Log acquisti</h2>
        <button
          type="button"
          onClick={handleUndoLast}
          disabled={undoing || !purchases || purchases.length === 0}
        >
          Annulla ultimo acquisto
        </button>
      </header>

      {actionError && <p role="alert">{actionError}</p>}

      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : purchases === null ? (
        <p>Caricamento…</p>
      ) : purchases.length === 0 ? (
        <p>Nessun acquisto registrato.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Giocatore</th>
              <th>Squadra</th>
              <th>Ruolo</th>
              <th>Manager</th>
              <th>Prezzo</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={`${purchase.league_id}-${purchase.player_id}`}>
                <td>{purchase.player_name}</td>
                <td>{purchase.player_team}</td>
                <td>{purchase.player_ruolo}</td>
                <td>{purchase.manager_name}</td>
                <td>{purchase.prezzo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
