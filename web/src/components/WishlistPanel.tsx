import { useState } from "react";
import type { WishlistEntryWithPlayer } from "@fanta-helper/shared";
import * as wishlistApi from "../api/wishlist";
import { WishlistApiError } from "../api/wishlist";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";

interface WishlistPanelProps {
  leagueId: number;
  wishlist: WishlistEntryWithPlayer[] | null;
  loadError: string | null;
  purchasedPlayerIds: Set<number>;
  onChanged: () => void;
}

export function WishlistPanel({
  leagueId,
  wishlist,
  loadError,
  purchasedPlayerIds,
  onChanged,
}: WishlistPanelProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null);

  async function handleMove(index: number, direction: -1 | 1) {
    if (!wishlist) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= wishlist.length) return;
    const reordered = wishlist.map((entry) => entry.player_id);
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved!);

    setBusyPlayerId(wishlist[index]!.player_id);
    try {
      await wishlistApi.reorderWishlist(leagueId, reordered);
      setActionError(null);
      onChanged();
    } catch (err) {
      setActionError(err instanceof WishlistApiError ? err.payload.error.message : "riordino fallito");
    } finally {
      setBusyPlayerId(null);
    }
  }

  async function handleRemove(playerId: number, playerName: string) {
    const confirmed = window.confirm(`Rimuovere ${playerName} dalla wishlist?`);
    if (!confirmed) return;
    setBusyPlayerId(playerId);
    try {
      await wishlistApi.removeFromWishlist(leagueId, playerId);
      setActionError(null);
      onChanged();
    } catch (err) {
      setActionError(err instanceof WishlistApiError ? err.payload.error.message : "rimozione fallita");
    } finally {
      setBusyPlayerId(null);
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>Obiettivi d'asta (wishlist)</h2>
      </header>

      {actionError && <StatusMessage kind="error">{actionError}</StatusMessage>}

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : wishlist === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : wishlist.length === 0 ? (
        <StatusMessage kind="empty">
          Nessun obiettivo in wishlist. Aggiungi giocatori dalla ricerca qui sopra.
        </StatusMessage>
      ) : (
        <div className="table-wrap table-wrap--scroll">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Giocatore</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {wishlist.map((entry, index) => {
                const purchased = purchasedPlayerIds.has(entry.player_id);
                const busy = busyPlayerId === entry.player_id;
                return (
                  <tr key={entry.player_id}>
                    <td>
                      <PlayerAvatar
                        name={entry.name}
                        team={entry.team}
                        ruolo={entry.ruolo}
                        image_url={entry.image_url}
                        size="sm"
                      />
                    </td>
                    <td>{entry.name}</td>
                    <td>{entry.team}</td>
                    <td>{entry.ruolo}</td>
                    <td>
                      <span className={purchased ? "badge badge--purchased" : "badge badge--available"}>
                        {purchased ? "assegnato" : "disponibile"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={busy || index === 0}
                          title="Sposta su"
                          onClick={() => handleMove(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={busy || index === wishlist.length - 1}
                          title="Sposta giù"
                          onClick={() => handleMove(index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={busy}
                          title="Rimuovi dalla wishlist"
                          onClick={() => handleRemove(entry.player_id, entry.name)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
