import { useState } from "react";
import type {
  PlayerAttributes,
  PlayerLatestSeasonStats,
  PlayerRecommendationWithTags,
  ProbableLineupEntry,
  QuotationRow,
  SetPieceTakerEntry,
} from "@fanta-helper/shared";
import {
  COMPARE_SORT_KEYS,
  COMPARE_SORT_LABEL,
  deltaColor,
  formatDelta,
  lineupStatusFor,
  setPieceRanksFor,
  type CompareRow,
  type CompareSortKey,
} from "../lib/auctionDerivations";
import { PlayerDetailPanel } from "./PlayerDetailPanel";
import { ScoreBreakdownDialog } from "./ScoreBreakdownDialog";

// Sottoinsieme strutturale di `AuctionView` sufficiente al riquadro: consente
// di testare il componente senza costruire l'intera view.
export interface AlternativesPanelView {
  compareRows: CompareRow[];
  compareMaxFv: number;
  compareSortKey: CompareSortKey;
  onCompareSortKey: (k: CompareSortKey) => void;
  compareSortValueFor: (playerId: number) => number | null;
  quotationFor: (playerId: number) => QuotationRow | undefined;
  weightedFvmFor: (playerId: number) => number | null;
  seasonStatsById: Map<number, PlayerLatestSeasonStats>;
  attributesFor: (playerId: number) => PlayerAttributes | undefined;
  probableLineup: ProbableLineupEntry[] | null;
  setPieceTakers: SetPieceTakerEntry[] | null;
  recommendationFor: (playerId: number) => PlayerRecommendationWithTags | undefined;
  normalizedScoreFor: (playerId: number) => number | null;
}

interface AlternativesPanelProps {
  view: AlternativesPanelView;
}

// Riquadro delle alternative dello stesso ruolo, accanto al giocatore in
// chiamata: parte collassato, e una volta aperto mostra tutti i nomi liberi
// su griglia a 3 colonne (nessuna immagine, nessuna paginazione). Il click su
// un nome non seleziona il giocatore in chiamata — apre solo i suoi dettagli
// (fair value/target/max, delta, punteggio, stats/attributi) nel pannello
// sotto la griglia.
//
// Il pannello si azzera al cambio del giocatore in chiamata o
// dell'ordinamento perché il chiamante monta il componente con
// `key={`${selectedPlayer.id}:${compareSortKey}`}`: il cambio di key rimonta il
// componente e riporta lo stato locale (collassato, nessun dettaglio aperto).
export function AlternativesPanel({ view }: AlternativesPanelProps) {
  const { compareRows: rows, compareSortKey: sortKey } = view;
  const [collapsed, setCollapsed] = useState(true);
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [breakdownPlayerId, setBreakdownPlayerId] = useState<number | null>(null);

  const breakdownRec =
    breakdownPlayerId === null ? undefined : view.recommendationFor(breakdownPlayerId);
  const expandedRow = rows.find((r) => r.player.id === expandedPlayerId);

  return (
    <div
      role="region"
      aria-label="Alternative nello stesso ruolo"
      data-testid="alternatives-panel"
      style={{
        margin: "10px 0 0",
        borderTop: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
        paddingTop: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          width: "100%",
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>
          {collapsed ? "›" : "⌄"} Alternative nello stesso ruolo — ancora libere
        </h6>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {rows.length} libere · ordinate per {COMPARE_SORT_LABEL[sortKey]}
        </span>
      </button>

      {!collapsed && (
        <>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, margin: "8px 0" }}
          >
            <span style={{ color: "var(--color-neutral-700)" }}>Ordina per</span>
            <select
              className="input"
              aria-label="Ordina alternative per"
              value={sortKey}
              onChange={(e) => view.onCompareSortKey(e.target.value as CompareSortKey)}
              style={{ padding: "4px 8px", fontSize: 12, flex: 1, minWidth: 0 }}
            >
              {COMPARE_SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {COMPARE_SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          {rows.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-neutral-700)", margin: "4px 0" }}>
              Nessuna alternativa libera in questo ruolo.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "4px 12px",
              }}
            >
              {rows.map(({ player }) => {
                const on = expandedPlayerId === player.id;
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedPlayerId(on ? null : player.id)}
                      className="ellipsis"
                      aria-pressed={on}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: 0,
                        background: "transparent",
                        padding: "3px 0",
                        font: "inherit",
                        fontSize: 13,
                        fontWeight: on ? 700 : 400,
                        color: "var(--color-accent-700)",
                        cursor: "pointer",
                      }}
                    >
                      {player.nome_completo ?? player.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {expandedRow && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    font: "600 11px/1 var(--font-heading)",
                    color: "var(--color-accent-700)",
                  }}
                >
                  {expandedRow.valuation?.tier ?? ""}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {expandedRow.player.nome_completo ?? expandedRow.player.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                  {expandedRow.player.team}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 12 }}
                  onClick={() => setExpandedPlayerId(null)}
                >
                  Chiudi
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="num" style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                  fv{" "}
                  <strong style={{ color: "var(--color-text)" }}>
                    {expandedRow.valuation?.fair_value ?? "—"}
                  </strong>
                  {" · "}tgt {expandedRow.valuation?.target ?? "—"}
                  {" · "}max {expandedRow.valuation?.max_bid ?? "—"}
                </span>
                <span
                  className="num"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      expandedRow.delta === null
                        ? "var(--color-neutral-700)"
                        : deltaColor(expandedRow.delta),
                  }}
                >
                  {expandedRow.delta === null ? "—" : formatDelta(expandedRow.delta)}
                </span>
                {expandedRow.displayScore !== null && (
                  <button
                    type="button"
                    className="info-label__more num"
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--color-neutral-800)" }}
                    onClick={() => setBreakdownPlayerId(expandedRow.player.id)}
                    title="Scomposizione punteggio"
                  >
                    {expandedRow.displayScore.toFixed(1)}
                  </button>
                )}
              </div>

              <PlayerDetailPanel
                player={expandedRow.player}
                quotation={view.quotationFor(expandedRow.player.id)}
                fvmWeighted={view.weightedFvmFor(expandedRow.player.id)}
                seasonStats={view.seasonStatsById.get(expandedRow.player.id)}
                lineupStatus={lineupStatusFor(expandedRow.player, view.probableLineup)}
                setPieceRanks={setPieceRanksFor(expandedRow.player, view.setPieceTakers)}
                tags={expandedRow.tags}
                attributes={view.attributesFor(expandedRow.player.id)}
              />
            </div>
          )}
        </>
      )}

      {breakdownRec && (
        <ScoreBreakdownDialog
          player={breakdownRec}
          normalizedScore={view.normalizedScoreFor(breakdownRec.player_id)}
          onClose={() => setBreakdownPlayerId(null)}
        />
      )}
    </div>
  );
}
