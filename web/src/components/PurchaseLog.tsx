import { useState } from "react";
import type { PurchaseWithDetails } from "@fanta-helper/shared";
import * as purchasesApi from "../api/purchases";
import { PurchasesApiError } from "../api/purchases";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";

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
    <section className="card">
      <header className="card-header">
        <h2>Log acquisti</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleUndoLast}
          disabled={undoing || !purchases || purchases.length === 0}
        >
          Annulla ultimo acquisto
        </button>
      </header>

      {actionError && <StatusMessage kind="error">{actionError}</StatusMessage>}

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : purchases === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : purchases.length === 0 ? (
        <StatusMessage kind="empty">Nessun acquisto registrato.</StatusMessage>
      ) : (
        <div className="table-wrap table-wrap--scroll">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Giocatore</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Manager</th>
                <th className="num">Prezzo</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={`${purchase.league_id}-${purchase.player_id}`}>
                  <td>
                    <PlayerAvatar
                      name={purchase.player_name}
                      team={purchase.player_team}
                      ruolo={purchase.player_ruolo}
                      image_url={purchase.player_image_url}
                      size="sm"
                    />
                  </td>
                  <td>{purchase.player_name}</td>
                  <td>{purchase.player_team}</td>
                  <td>{purchase.player_ruolo}</td>
                  <td>{purchase.manager_name}</td>
                  <td className="num">{purchase.prezzo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
