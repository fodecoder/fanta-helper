import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import type {
  Manager,
  ManagerAuctionStatus,
  Player,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import * as purchasesApi from "../api/purchases";
import { PurchasesApiError } from "../api/purchases";
import * as playersApi from "../api/players";
import * as managersApi from "../api/managers";
import * as valuationsApi from "../api/valuations";
import * as wishlistApi from "../api/wishlist";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";

interface PurchaseFormProps {
  leagueId: number;
  purchasedPlayerIds: Set<number>;
  wishlistPlayerIds: Set<number>;
  statuses: ManagerAuctionStatus[] | null;
  onSaved: () => void;
  onWishlistChanged: () => void;
}

export function PurchaseForm({
  leagueId,
  purchasedPlayerIds,
  wishlistPlayerIds,
  statuses,
  onSaved,
  onWishlistChanged,
}: PurchaseFormProps) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [filter, setFilter] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingWishlistId, setTogglingWishlistId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    playersApi
      .listPlayers(controller.signal)
      .then(setPlayers)
      .catch(() => setPlayers([]));
    managersApi
      .listManagers(leagueId, controller.signal)
      .then(setManagers)
      .catch(() => setManagers([]));
    valuationsApi
      .listValuations(leagueId, controller.signal)
      .then(setValuations)
      .catch(() => setValuations([]));
    return () => controller.abort();
  }, [leagueId]);

  const available = (players ?? []).filter((player) => !purchasedPlayerIds.has(player.id));
  const filtered = available.filter((player) => {
    const needle = filter.trim().toLowerCase();
    if (needle === "") return true;
    return player.name.toLowerCase().includes(needle) || player.team.toLowerCase().includes(needle);
  });
  const selectedPlayer = available.find((player) => String(player.id) === playerId);
  const selectedValuation = valuations?.find((v) => v.player_id === Number(playerId));
  const activeManagerStatus = statuses?.find((s) => s.managerId === Number(managerId));

  async function handleToggleWishlist(event: MouseEvent, playerId: number) {
    event.stopPropagation();
    setTogglingWishlistId(playerId);
    try {
      if (wishlistPlayerIds.has(playerId)) {
        await wishlistApi.removeFromWishlist(leagueId, playerId);
      } else {
        await wishlistApi.addToWishlist(leagueId, playerId);
      }
      onWishlistChanged();
    } catch {
      // la wishlist è un supporto secondario: un fallimento qui non deve
      // interrompere il flusso di assegnazione, lo stato della stella resta
      // semplicemente invariato al prossimo refresh
    } finally {
      setTogglingWishlistId(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (playerId === "") {
      setError("seleziona un giocatore");
      return;
    }
    if (managerId === "") {
      setError("seleziona un manager");
      return;
    }
    const prezzoValue = Number(prezzo);
    if (!Number.isInteger(prezzoValue) || prezzoValue < 0) {
      setError("prezzo non valido");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await purchasesApi.createPurchase(leagueId, {
        player_id: Number(playerId),
        manager_id: Number(managerId),
        prezzo: prezzoValue,
      });
      setPlayerId("");
      setPrezzo("");
      setFilter("");
      onSaved();
    } catch (err) {
      setError(
        err instanceof PurchasesApiError ? err.payload.error.message : "assegnazione fallita",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Assegna giocatore</h2>

      {error && <StatusMessage kind="error">{error}</StatusMessage>}

      <form onSubmit={handleSubmit}>
        <label>
          Cerca giocatore
          <input
            placeholder="filtra per nome/squadra"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <ul className="player-listbox" role="listbox" aria-label="Giocatori">
          {filtered.length === 0 ? (
            <li className="player-listbox-empty">Nessun giocatore trovato.</li>
          ) : (
            filtered.map((player) => {
              const wishlisted = wishlistPlayerIds.has(player.id);
              return (
                <li key={player.id} className="player-listbox-row">
                  <button
                    type="button"
                    className={
                      wishlisted ? "player-listbox-item player-listbox-item--wishlisted" : "player-listbox-item"
                    }
                    role="option"
                    aria-selected={String(player.id) === playerId}
                    onClick={() => setPlayerId(String(player.id))}
                  >
                    <PlayerAvatar
                      name={player.name}
                      team={player.team}
                      ruolo={player.ruolo}
                      image_url={player.image_url}
                      size="sm"
                    />
                    <span>
                      {player.name} ({player.team}, {player.ruolo})
                    </span>
                  </button>
                  <button
                    type="button"
                    className={wishlisted ? "wishlist-toggle wishlist-toggle--active" : "wishlist-toggle"}
                    aria-pressed={wishlisted}
                    disabled={togglingWishlistId === player.id}
                    title={wishlisted ? "Rimuovi dalla wishlist" : "Aggiungi alla wishlist"}
                    onClick={(event) => handleToggleWishlist(event, player.id)}
                  >
                    {wishlisted ? "★" : "☆"}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {selectedPlayer && (
          <p>
            Selezionato: <strong>{selectedPlayer.name}</strong> ({selectedPlayer.team},{" "}
            {selectedPlayer.ruolo})
          </p>
        )}

        {selectedValuation && (
          <p>
            Valutazione: tier {selectedValuation.tier} · fair value {selectedValuation.fair_value} ·
            max bid {selectedValuation.max_bid} · panic price {selectedValuation.panic_price}
          </p>
        )}

        <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">— seleziona manager —</option>
          {(managers ?? []).map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>

        {activeManagerStatus && (
          <p>
            Max bid rettificato per {activeManagerStatus.managerName}:{" "}
            <strong className="highlight-value">{activeManagerStatus.adjustedMaxBid}</strong>{" "}
            (residuo {activeManagerStatus.residuo})
          </p>
        )}

        <label>
          Prezzo
          <input
            type="number"
            min={0}
            step={1}
            value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)}
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Assegnazione in corso…" : "Assegna"}
          </button>
        </div>
      </form>
    </section>
  );
}
