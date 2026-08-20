import { Fragment, useState } from "react";
import { CmykNum } from "../../components/CmykNum";
import { PlayerDetailPanel } from "../../components/PlayerDetailPanel";
import {
  ROLE_LABEL,
  deltaColor,
  formatDelta,
  lineupStatusFor,
  roleColor,
  setPieceRanksFor,
} from "../../lib/auctionDerivations";
import type { AuctionView, PlayerSortKey, RoleFilter } from "./AuctionMode";

const ROLE_FILTERS: RoleFilter[] = ["tutti", "P", "D", "C", "A"];
const SORT_LABEL: Record<PlayerSortKey, string> = {
  valore: "Valore",
  fvm: "FVM",
  qt_a: "Qt.A",
  qt_i: "Qt.I",
};
const SORT_KEYS: PlayerSortKey[] = ["valore", "fvm", "qt_a", "qt_i"];

export function AuctionDesktop({ view }: { view: AuctionView }) {
  const { selectedPlayer: sel, selectedValuation: val, me } = view;
  const freeSlots = me ? me.slots.reduce((s, x) => s + Math.max(x.free, 0), 0) : 0;
  const showStats = view.enrichment?.enabled === true;
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  return (
    <div className="auction">
      <header className="auction-head">
        <div className="auction-head-row">
          <span className="auction-brand">FantaProfeta</span>
          <span className="auction-live">Asta live</span>
          <span className="auction-meta">
            {view.league.name} · {view.callsLabel}
          </span>
          <span className="auction-keys">↑↓ scegli · Invio assegna · 1-9 prezzo · Esc esci</span>
          <button type="button" className="btn btn-secondary" onClick={view.onExit}>
            Esci
          </button>
        </div>
        <div className="rule-heavy" />
        <div className="rule-thin" />
      </header>

      <div className="auction-grid">
        {/* Colonna 1 — chiamata */}
        <section className="call-col">
          <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>
            Chiamata · {view.availableCount} liberi
          </h6>
          <input
            autoFocus
            className="input"
            style={{ fontSize: 16 }}
            placeholder="nome o squadra"
            value={view.query}
            onChange={(e) => view.onQuery(e.target.value)}
          />
          <div className="seg" role="group" aria-label="Filtro ruolo">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                className="seg-opt"
                style={{ flex: 1 }}
                aria-pressed={view.roleFilter === r}
                onClick={() => view.onRoleFilter(r)}
              >
                {r === "tutti" ? "Tutti" : r}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Ordina per">
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="seg-opt"
                style={{ flex: 1 }}
                aria-pressed={view.sortKey === k}
                onClick={() => view.onSortKey(k)}
              >
                {SORT_LABEL[k]}
              </button>
            ))}
          </div>
          <ul className="call-list">
            {view.visiblePlayers.map((p) => {
              const on = p.id === sel?.id;
              const starred = view.wishlistPlayerIds.has(p.id);
              const pv = view.valuationFor(p.id);
              return (
                <li className="call-row" key={p.id}>
                  <button
                    type="button"
                    className={on ? "call-pick call-pick--on" : "call-pick"}
                    onClick={() => view.onSelect(p.id)}
                  >
                    <span
                      className={on ? "call-mark call-mark--on" : "call-mark"}
                      style={{ background: roleColor(p.ruolo) }}
                    />
                    <span className="call-tier">{pv?.tier ?? ""}</span>
                    <span className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
                      {p.name}
                    </span>
                    <span className="text-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {p.team}
                    </span>
                    <span className="call-fv">{view.sortValueFor(p.id) ?? "—"}</span>
                  </button>
                  <button
                    type="button"
                    className={starred ? "star-btn star-btn--on" : "star-btn"}
                    title="Obiettivo d'asta"
                    onClick={() => view.onToggleWishlist(p.id)}
                  >
                    {starred ? "★" : "☆"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Colonna 2 — in asta */}
        <section className="bid-col">
          {sel ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 24,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span className="bid-kicker">In asta · {ROLE_LABEL[sel.ruolo]}</span>
                  <h1 className="bid-name">{sel.name}</h1>
                  <span style={{ fontSize: 15, color: "var(--color-neutral-800)" }}>
                    {sel.team}
                    {val &&
                      ` · tier ${val.tier} · fair value ${val.fair_value} · target ${val.target} · panic ${val.panic_price}`}
                  </span>
                  <PlayerDetailPanel
                    player={sel}
                    quotation={view.quotationFor(sel.id)}
                    seasonStats={view.seasonStatsById.get(sel.id)}
                    lineupStatus={lineupStatusFor(sel, view.probableLineup)}
                    setPieceRanks={setPieceRanksFor(sel, view.setPieceTakers)}
                  />
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      font: "600 10px/1 var(--font-heading)",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: "var(--color-neutral-700)",
                    }}
                  >
                    Verdetto
                  </span>
                  <div className="bid-verdict" style={{ color: view.verdict.color }}>
                    {view.verdict.text}
                  </div>
                </div>
              </div>

              {view.ladder && (
                <div style={{ padding: "26px 0 6px" }}>
                  <div className="ladder">
                    <span
                      className="ladder-zone ladder-zone--fv"
                      style={{
                        left: `${view.ladder.fvZone.left}%`,
                        width: `${view.ladder.fvZone.width}%`,
                      }}
                    />
                    <span
                      className="ladder-zone ladder-zone--over"
                      style={{
                        left: `${view.ladder.overZone.left}%`,
                        width: `${view.ladder.overZone.width}%`,
                      }}
                    />
                    {view.ladder.ticks.map((t) => {
                      const row = t.row === 1 ? 34 : 0;
                      return (
                        <span
                          key={t.key}
                          style={{ position: "absolute", top: 0, left: `${t.pct}%` }}
                        >
                          <span
                            className="ladder-tick-line"
                            style={{
                              width: t.accent ? 2 : 1,
                              height: 14 + row,
                              background: t.accent
                                ? "var(--color-accent)"
                                : "var(--color-neutral-600)",
                            }}
                          />
                          <span className="ladder-label" style={{ top: 12 + row }}>
                            {t.label}
                          </span>
                          <span className="ladder-value" style={{ top: 26 + row }}>
                            {t.value}
                          </span>
                        </span>
                      );
                    })}
                    {view.ladder.markerPct !== null && (
                      <span
                        className="ladder-marker"
                        style={{
                          left: `${view.ladder.markerPct}%`,
                          background: view.verdict.color,
                        }}
                      >
                        <span className="ladder-price" style={{ color: view.verdict.color }}>
                          {view.priceNum ?? "—"}
                        </span>
                      </span>
                    )}
                  </div>
                  <div style={{ height: 44 }} />
                </div>
              )}

              <div className="bid-price-row">
                <div className="field" style={{ width: 132 }}>
                  <label htmlFor="bid-price">Prezzo</label>
                  <input
                    id="bid-price"
                    className="input bid-price-input"
                    type="number"
                    min={0}
                    step={1}
                    value={view.price}
                    onChange={(e) => view.onPrice(e.target.value)}
                  />
                </div>
                <div className="bump-group">
                  {view.bumps.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => view.onBump(d)}
                    >
                      {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    flex: 1,
                    minWidth: 240,
                  }}
                >
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    A chi
                  </span>
                  <div className="chip-group">
                    {view.managers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={view.selectedManagerId === m.id ? "chip chip--on" : "chip"}
                        onClick={() => view.onSelectManager(m.id)}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 46, paddingInline: 26, fontSize: 16 }}
                  onClick={view.onAssign}
                  disabled={!view.canAssign}
                >
                  Assegna
                </button>
              </div>
              <div
                className="bid-impact"
                style={{
                  color: view.assignError ? "var(--color-accent-2-700)" : view.impact.color,
                }}
              >
                {view.assignError ?? view.impact.text}
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px 0" }}>
              <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>Nessun giocatore in asta</h1>
              <p style={{ maxWidth: "46ch", color: "var(--color-neutral-800)" }}>
                Scrivi un nome nella colonna di sinistra, oppure premi ↓ per prendere il primo della
                lista. Il confronto con le alternative dello stesso ruolo compare qui sotto.
              </p>
            </div>
          )}

          {sel && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 8,
                }}
              >
                <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>
                  Alternative nello stesso ruolo — ancora libere
                </h6>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {view.compareRows.length} libere · ordinate per fair value
                </span>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Giocatore</th>
                      <th>Squadra</th>
                      <th>Tier</th>
                      <th style={{ width: 150 }}>Fair value</th>
                      <th style={{ textAlign: "right" }}>Target</th>
                      <th style={{ textAlign: "right" }}>Max</th>
                      <th style={{ textAlign: "right" }}>Panic</th>
                      <th style={{ textAlign: "right" }}>Δ vs in asta</th>
                      {showStats && (
                        <>
                          <th style={{ textAlign: "right" }}>Min</th>
                          <th style={{ textAlign: "right" }}>Gol</th>
                          <th style={{ textAlign: "right" }}>Ass</th>
                        </>
                      )}
                      <th style={{ width: 90 }}>Dettagli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.compareRows.map(({ player, valuation, delta, isCurrent }) => {
                      const stats = view.enrichment?.stats.find((s) => s.player_id === player.id);
                      const expanded = expandedPlayerId === player.id;
                      const columnCount = showStats ? 12 : 9;
                      return (
                        <Fragment key={player.id}>
                          <tr
                            style={
                              isCurrent
                                ? {
                                    background:
                                      "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                                  }
                                : undefined
                            }
                          >
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => view.onSelect(player.id)}
                                style={{
                                  border: 0,
                                  background: "transparent",
                                  padding: 0,
                                  font: "inherit",
                                  fontWeight: isCurrent ? 600 : 400,
                                  color: isCurrent
                                    ? "var(--color-text)"
                                    : "var(--color-accent-700)",
                                  cursor: "pointer",
                                }}
                              >
                                {player.name}
                              </button>
                            </td>
                            <td>{player.team}</td>
                            <td style={{ fontWeight: 600, color: "var(--color-accent-700)" }}>
                              {valuation?.tier ?? "—"}
                            </td>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span className="bar-track" style={{ flex: 1, height: 7 }}>
                                  <span
                                    className="bar-fill"
                                    style={{
                                      width: `${Math.round(((valuation?.fair_value ?? 0) / view.compareMaxFv) * 100)}%`,
                                      background: isCurrent
                                        ? "var(--color-accent)"
                                        : "var(--color-neutral-600)",
                                    }}
                                  />
                                </span>
                                <span
                                  className="num"
                                  style={{ fontWeight: 600, width: 32, textAlign: "right" }}
                                >
                                  {valuation?.fair_value ?? "—"}
                                </span>
                              </span>
                            </td>
                            <td className="num" style={{ textAlign: "right" }}>
                              {valuation?.target ?? "—"}
                            </td>
                            <td className="num" style={{ textAlign: "right" }}>
                              {valuation?.max_bid ?? "—"}
                            </td>
                            <td
                              className="num"
                              style={{ textAlign: "right", color: "var(--color-neutral-700)" }}
                            >
                              {valuation?.panic_price ?? "—"}
                            </td>
                            <td
                              className="num"
                              style={{
                                textAlign: "right",
                                fontWeight: 600,
                                color:
                                  delta === null ? "var(--color-neutral-700)" : deltaColor(delta),
                              }}
                            >
                              {isCurrent ? "—" : delta === null ? "—" : formatDelta(delta)}
                            </td>
                            {showStats && (
                              <>
                                <td
                                  className="num"
                                  style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                >
                                  {stats?.minutes ?? "—"}
                                </td>
                                <td
                                  className="num"
                                  style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                >
                                  {stats?.goals ?? "—"}
                                </td>
                                <td
                                  className="num"
                                  style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                >
                                  {stats?.assists ?? "—"}
                                </td>
                              </>
                            )}
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: "3px 10px", fontSize: 12 }}
                                onClick={() => setExpandedPlayerId(expanded ? null : player.id)}
                              >
                                {expanded ? "Chiudi" : "Dettagli"}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={columnCount} style={{ padding: 0 }}>
                                <PlayerDetailPanel
                                  player={player}
                                  quotation={view.quotationFor(player.id)}
                                  seasonStats={view.seasonStatsById.get(player.id)}
                                  lineupStatus={lineupStatusFor(player, view.probableLineup)}
                                  setPieceRanks={setPieceRanksFor(player, view.setPieceTakers)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Colonna 3 — io */}
        <aside className="io-col">
          <div>
            <h6 style={{ margin: "0 0 18px", color: "var(--color-neutral-700)" }}>Io</h6>
            <div className="io-maxbid">
              <CmykNum value={me?.adjustedMaxBid ?? 0} />
              <div className="l">Max bid rettificato</div>
            </div>
            <div className="io-figures">
              <div>
                <div className="n">{me?.residuo ?? 0}</div>
                <div className="l">residuo</div>
              </div>
              <div>
                <div className="n">{me?.spent ?? 0}</div>
                <div className="l">speso</div>
              </div>
              <div>
                <div className="n">{freeSlots}</div>
                <div className="l">slot liberi</div>
              </div>
            </div>
          </div>

          <div>
            <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
              Rosa · slot per ruolo
            </h6>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(me?.slots ?? []).map((s) => (
                <div className="slot-row" key={s.ruolo}>
                  <span className="role-tag" style={{ width: 18, color: roleColor(s.ruolo) }}>
                    {s.ruolo}
                  </span>
                  <span className="slot-pips">
                    {Array.from({ length: s.total }, (_, i) => (
                      <span
                        key={i}
                        className="slot-pip"
                        style={i < s.used ? { background: roleColor(s.ruolo) } : undefined}
                      />
                    ))}
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 12,
                      color: "var(--color-neutral-800)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.used}/{s.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>Ultime chiamate</h6>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={view.onUndo}
              >
                Annulla ultima
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {view.logRows.map((l) => (
                <div className="log-row" key={l.key}>
                  <span className="log-dot" style={{ background: roleColor(l.ruolo) }} />
                  <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    {l.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-neutral-700)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.manager}
                  </span>
                  <span className="num" style={{ fontWeight: 600, fontSize: 13 }}>
                    {l.prezzo}
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 11,
                      width: 34,
                      textAlign: "right",
                      color: l.delta === null ? "var(--color-neutral-700)" : deltaColor(l.delta),
                    }}
                  >
                    {l.delta === null ? "—" : formatDelta(l.delta)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h6 style={{ margin: "0 0 8px", color: "var(--color-neutral-700)" }}>Obiettivi</h6>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {view.wishRows.map((w) => (
                <button
                  key={w.player_id}
                  type="button"
                  className="wish-pick"
                  onClick={() => view.onSelect(w.player_id)}
                >
                  <span
                    style={{
                      font: "600 11px/1 var(--font-heading)",
                      color: "var(--color-accent-700)",
                      width: 22,
                    }}
                  >
                    {w.tier ?? ""}
                  </span>
                  <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    {w.name}
                  </span>
                  <span className="num" style={{ fontSize: 12, color: "var(--color-neutral-800)" }}>
                    {w.fv ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
