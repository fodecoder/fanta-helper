import { useEffect, useState } from "react";
import type {
  ManagerAuctionStatus,
  Player,
  StatsEnrichmentResponse,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import { OWNER_MANAGER_NAME } from "@fanta-helper/shared";
import * as statsEnrichmentApi from "../api/statsEnrichment";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";

interface RoleComparisonPanelProps {
  selectedPlayer: Player | undefined;
  players: Player[] | null;
  valuations: ValuationWithPlayer[] | null;
  purchasedPlayerIds: Set<number>;
  statuses: ManagerAuctionStatus[] | null;
  playersLoadError: string | null;
  valuationsLoadError: string | null;
}

interface RankRow {
  player: Player;
  valuation: ValuationWithPlayer | undefined;
}

// Ranking is purely derived from data already fetched client-side (players,
// per-league valuations, purchase log) — no dedicated backend endpoint, no
// stored state, deterministic like the rest of the auction derivations.
function rankSameRole(
  players: Player[],
  valuations: ValuationWithPlayer[],
  purchasedPlayerIds: Set<number>,
  ruolo: Player["ruolo"],
): RankRow[] {
  const rows: RankRow[] = players
    .filter((player) => player.ruolo === ruolo && !purchasedPlayerIds.has(player.id))
    .map((player) => ({
      player,
      valuation: valuations.find((v) => v.player_id === player.id),
    }));

  return rows.sort((a, b) => {
    if (a.valuation && b.valuation) {
      if (b.valuation.fair_value !== a.valuation.fair_value) {
        return b.valuation.fair_value - a.valuation.fair_value;
      }
      if (b.valuation.target !== a.valuation.target) {
        return b.valuation.target - a.valuation.target;
      }
      return a.player.name.localeCompare(b.player.name);
    }
    if (a.valuation) return -1;
    if (b.valuation) return 1;
    return a.player.name.localeCompare(b.player.name);
  });
}

export function RoleComparisonPanel({
  selectedPlayer,
  players,
  valuations,
  purchasedPlayerIds,
  statuses,
  playersLoadError,
  valuationsLoadError,
}: RoleComparisonPanelProps) {
  const [enrichment, setEnrichment] = useState<StatsEnrichmentResponse | null>(null);

  const rows =
    selectedPlayer && players && valuations
      ? rankSameRole(players, valuations, purchasedPlayerIds, selectedPlayer.ruolo)
      : [];

  useEffect(() => {
    if (rows.length === 0) return;
    const controller = new AbortController();
    statsEnrichmentApi
      .getStatsEnrichment(
        rows.map((row) => row.player.id),
        controller.signal,
      )
      .then(setEnrichment)
      .catch(() => setEnrichment(null));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.id, players, valuations, purchasedPlayerIds]);

  const ownerStatus = statuses?.find((s) => s.managerName === OWNER_MANAGER_NAME);
  const ownerSlot =
    ownerStatus && selectedPlayer
      ? ownerStatus.slots.find((slot) => slot.ruolo === selectedPlayer.ruolo)
      : undefined;

  const showEnrichment = rows.length > 0 && enrichment?.enabled === true;

  return (
    <section className="card">
      <h2>Confronto per ruolo</h2>

      {!selectedPlayer ? (
        <StatusMessage kind="empty">Seleziona un giocatore per vedere il confronto.</StatusMessage>
      ) : playersLoadError || valuationsLoadError ? (
        <StatusMessage kind="error">{playersLoadError ?? valuationsLoadError}</StatusMessage>
      ) : (
        <>
          {ownerStatus && ownerSlot ? (
            <p>
              Bisogni di {ownerStatus.managerName} per il ruolo {selectedPlayer.ruolo}: slot liberi{" "}
              <strong>{ownerSlot.free}</strong>/{ownerSlot.total} · residuo{" "}
              <strong>{ownerStatus.residuo}</strong> · max bid rettificato{" "}
              <strong className="highlight-value">{ownerStatus.adjustedMaxBid}</strong>
            </p>
          ) : (
            <StatusMessage kind="empty">
              Nessun manager "{OWNER_MANAGER_NAME}" trovato in questa lega.
            </StatusMessage>
          )}

          <div className="table-wrap table-wrap--scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Giocatore</th>
                  <th>Squadra</th>
                  <th>Tier</th>
                  <th className="num">Fair value</th>
                  <th className="num">Target</th>
                  <th className="num">Max bid</th>
                  <th className="num">Panic price</th>
                  {showEnrichment && (
                    <>
                      <th className="num">Min</th>
                      <th className="num">Gol</th>
                      <th className="num">Assist</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ player, valuation }) => {
                  const stats = enrichment?.stats.find((s) => s.player_id === player.id);
                  return (
                    <tr
                      key={player.id}
                      className={player.id === selectedPlayer.id ? "rank-row--current" : undefined}
                    >
                      <td>
                        <PlayerAvatar
                          name={player.name}
                          team={player.team}
                          ruolo={player.ruolo}
                          image_url={player.image_url}
                          size="sm"
                        />
                      </td>
                      <td>{player.name}</td>
                      <td>{player.team}</td>
                      <td>{valuation?.tier ?? "—"}</td>
                      <td className="num">{valuation?.fair_value ?? "—"}</td>
                      <td className="num">{valuation?.target ?? "—"}</td>
                      <td className="num">{valuation?.max_bid ?? "—"}</td>
                      <td className="num">{valuation?.panic_price ?? "—"}</td>
                      {showEnrichment && (
                        <>
                          <td className="num">{stats?.minutes ?? "—"}</td>
                          <td className="num">{stats?.goals ?? "—"}</td>
                          <td className="num">{stats?.assists ?? "—"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
