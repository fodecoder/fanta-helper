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
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerDetailPanel } from "./PlayerDetailPanel";
import { ScoreBreakdownDialog } from "./ScoreBreakdownDialog";
import { TeamPrefBadge } from "./ui/TeamPrefBadge";

const PAGE_SIZE = 5;

// Sottoinsieme strutturale di `AuctionView` sufficiente al riquadro: consente
// di testare il componente senza costruire l'intera view.
export interface AlternativesPanelView {
  compareRows: CompareRow[];
  compareMaxFv: number;
  compareSortKey: CompareSortKey;
  onCompareSortKey: (k: CompareSortKey) => void;
  compareSortValueFor: (playerId: number) => number | null;
  onSelect: (playerId: number) => void;
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

// Riquadro compatto delle alternative dello stesso ruolo, accanto al giocatore
// in chiamata: 5 righe per pagina con paginazione. Le colonne complete
// (stats/attributi/scomposizione punteggio) restano raggiungibili per singolo
// giocatore via `PlayerDetailPanel` / `ScoreBreakdownDialog`.
//
// La paginazione si azzera al cambio del giocatore in chiamata o
// dell'ordinamento perché il chiamante monta il componente con
// `key={`${selectedPlayer.id}:${compareSortKey}`}`: il cambio di key rimonta il
// componente e riporta lo stato locale ai valori iniziali.
export function AlternativesPanel({ view }: AlternativesPanelProps) {
  const { compareRows: rows, compareSortKey: sortKey } = view;
  const [page, setPage] = useState(0);
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [breakdownPlayerId, setBreakdownPlayerId] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const breakdownRec =
    breakdownPlayerId === null ? undefined : view.recommendationFor(breakdownPlayerId);

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
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>
          Alternative nello stesso ruolo — ancora libere
        </h6>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {rows.length} libere · ordinate per {COMPARE_SORT_LABEL[sortKey]}
        </span>
      </div>

      <label
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 8 }}
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
        <>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {pageRows.map(({ player, valuation, delta, tags, teamPref, displayScore }) => {
              const expanded = expandedPlayerId === player.id;
              const fv = valuation?.fair_value ?? 0;
              return (
                <li
                  key={player.id}
                  style={{
                    borderBottom:
                      "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                    paddingBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PlayerAvatar
                      name={player.nome_completo ?? player.name}
                      team={player.team}
                      ruolo={player.ruolo}
                      image_url={player.image_url}
                      size="sm"
                    />
                    <span
                      style={{
                        font: "600 11px/1 var(--font-heading)",
                        color: "var(--color-accent-700)",
                        width: 26,
                      }}
                    >
                      {valuation?.tier ?? ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => view.onSelect(player.id)}
                      className="ellipsis"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        font: "inherit",
                        color: "var(--color-accent-700)",
                        cursor: "pointer",
                      }}
                    >
                      {player.nome_completo ?? player.name}
                    </button>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-neutral-700)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {player.team}
                      <TeamPrefBadge pref={teamPref} variant="dot" />
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <span className="bar-track" style={{ flex: 1, height: 6 }}>
                      <span
                        className="bar-fill"
                        style={{
                          width: `${Math.round((fv / view.compareMaxFv) * 100)}%`,
                          background: "var(--color-neutral-600)",
                        }}
                      />
                    </span>
                    <span
                      className="num"
                      style={{ fontSize: 11, color: "var(--color-neutral-700)" }}
                    >
                      fv <strong style={{ color: "var(--color-text)" }}>{valuation?.fair_value ?? "—"}</strong>
                      {" · "}tgt {valuation?.target ?? "—"}
                      {" · "}max {valuation?.max_bid ?? "—"}
                    </span>
                    <span
                      className="num"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        width: 42,
                        textAlign: "right",
                        color: delta === null ? "var(--color-neutral-700)" : deltaColor(delta),
                      }}
                    >
                      {delta === null ? "—" : formatDelta(delta)}
                    </span>
                    {displayScore === null ? (
                      <span
                        className="num"
                        style={{ fontSize: 12, width: 30, textAlign: "right", color: "var(--color-neutral-700)" }}
                      >
                        —
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="info-label__more num"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          width: 30,
                          textAlign: "right",
                          color: "var(--color-neutral-800)",
                        }}
                        onClick={() => setBreakdownPlayerId(player.id)}
                        title="Scomposizione punteggio"
                      >
                        {displayScore.toFixed(1)}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 8, padding: "3px 10px", fontSize: 12 }}
                    onClick={() => setExpandedPlayerId(expanded ? null : player.id)}
                  >
                    {expanded ? "Chiudi" : "Dettagli"}
                  </button>

                  {expanded && (
                    <PlayerDetailPanel
                      player={player}
                      quotation={view.quotationFor(player.id)}
                      fvmWeighted={view.weightedFvmFor(player.id)}
                      seasonStats={view.seasonStatsById.get(player.id)}
                      lineupStatus={lineupStatusFor(player, view.probableLineup)}
                      setPieceRanks={setPieceRanksFor(player, view.setPieceTakers)}
                      tags={tags}
                      attributes={view.attributesFor(player.id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {rows.length > PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "3px 10px", fontSize: 12 }}
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                Precedente
              </button>
              <span className="text-muted num" style={{ fontSize: 12 }}>
                Pagina {safePage + 1} di {pageCount}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "3px 10px", fontSize: 12 }}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Successiva
              </button>
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
