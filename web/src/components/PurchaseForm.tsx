import { useEffect, useState, type FormEvent } from "react";
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

interface PurchaseFormProps {
  leagueId: number;
  purchasedPlayerIds: Set<number>;
  statuses: ManagerAuctionStatus[] | null;
  onSaved: () => void;
}

export function PurchaseForm({
  leagueId,
  purchasedPlayerIds,
  statuses,
  onSaved,
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
  const selectedValuation = valuations?.find((v) => v.player_id === Number(playerId));
  const activeManagerStatus = statuses?.find((s) => s.managerId === Number(managerId));

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
    <section>
      <h2>Assegna giocatore</h2>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Cerca giocatore
          <input
            placeholder="filtra per nome/squadra"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          <option value="">— seleziona giocatore —</option>
          {filtered.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.team}, {player.ruolo})
            </option>
          ))}
        </select>

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
            <strong>{activeManagerStatus.adjustedMaxBid}</strong> (residuo{" "}
            {activeManagerStatus.residuo})
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

        <div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Assegnazione in corso…" : "Assegna"}
          </button>
        </div>
      </form>
    </section>
  );
}
