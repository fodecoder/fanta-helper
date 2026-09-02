import { Fragment, useState } from "react";
import { GkPairingHint } from "../../components/GkPairingHint";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import { OpponentRosterDialog } from "./OpponentRosterDialog";
import { ModifierWarning } from "../../components/ModifierWarning";
import { PlayerDetailPanel } from "../../components/PlayerDetailPanel";
import { ScoreBreakdownDialog } from "../../components/ScoreBreakdownDialog";
import { InfoLabel } from "../../components/ui/InfoLabel";
import { TeamPrefBadge } from "../../components/ui/TeamPrefBadge";
import { COLUMN_GLOSSARY } from "../../lib/columnGlossary";
import {
  ROLE_LABEL,
  deltaColor,
  formatDelta,
  lineupStatusFor,
  roleColor,
  setPieceRanksFor,
  type CompareSortKey,
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

const COMPARE_SORT_LABEL: Record<CompareSortKey, string> = {
  fair_value: "Fair value",
  target: "Target",
  max_bid: "Max",
  fm: "Fm",
  fvm: "FVM",
  qt_a: "Qt.A",
  score: "Score",
};
const COMPARE_SORT_KEYS: CompareSortKey[] = [
  "fair_value",
  "target",
  "max_bid",
  "fm",
  "fvm",
  "qt_a",
  "score",
];

export function AuctionDesktop({ view }: { view: AuctionView }) {
  const { selectedPlayer: sel, selectedValuation: val, me } = view;
  const freeSlots = me ? me.slots.reduce((s, x) => s + Math.max(x.free, 0), 0) : 0;
  const showStats = view.enrichment?.performance.enabled === true;
  const showAttributes = view.enrichment?.attributes.enabled === true;
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [breakdownPlayerId, setBreakdownPlayerId] = useState<number | null>(null);
  const [opponentsDialogOpen, setOpponentsDialogOpen] = useState(false);
  const breakdownRec = breakdownPlayerId === null ? undefined : view.recommendationFor(breakdownPlayerId);

  return (
    <div className="auction">
      <header className="auction-head">
        <div className="auction-head-row">
          <span className="auction-brand">FantaProfeta</span>
          <span className="auction-live">
            <span className="live-dot" />
            Asta live
          </span>
          <span className="auction-meta">
            {view.league.name} · {view.callsLabel}
          </span>
          <span className="auction-keys">↑↓ scegli · Invio assegna · 1-9 prezzo · Esc esci</span>
          <a
            href="https://sofifa.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="SoFIFA"
            style={{ display: "inline-flex", alignSelf: "center" }}
          >
            <img src="/sofifa-logo.png" alt="SoFIFA" style={{ height: 20, width: "auto" }} />
          </a>
          <button type="button" className="btn btn-secondary" onClick={view.onExit}>
            Esci
          </button>
        </div>
        <div className="rule-heavy" />
        <div className="rule-thin" />
        <ModifierWarning
          modificatori={view.league.modificatori}
          className="modifier-warning--tight"
        />
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
                    <span className="call-name-cell">
                      <span className="call-name ellipsis">{p.name}</span>
                      <span className="call-team ellipsis">{p.team}</span>
                    </span>
                    <TeamPrefBadge pref={view.teamPrefFor(p.id)} variant="dot" />
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
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0 }}>
                <PlayerAvatar
                  name={sel.nome_completo ?? sel.name}
                  team={sel.team}
                  ruolo={sel.ruolo}
                  image_url={sel.image_url}
                  size="hero"
                />
                <div style={{ minWidth: 0 }}>
                  <span className="bid-kicker">In asta · {ROLE_LABEL[sel.ruolo]}</span>
                  <h1 className="bid-name">{sel.nome_completo ?? sel.name}</h1>
                  {sel.nome_completo && sel.nome_completo !== sel.name && (
                    <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{sel.name}</span>
                  )}
                  <span style={{ fontSize: 15, color: "var(--color-neutral-800)" }}>
                    {sel.team}
                    {val &&
                      ` · tier ${val.tier} · fair value ${val.fair_value} · target ${val.target} · panic ${val.panic_price}`}
                  </span>
                  <div>
                    <TeamPrefBadge pref={view.teamPrefFor(sel.id)} variant="banner" />
                  </div>
                  <PlayerDetailPanel
                    player={sel}
                    quotation={view.quotationFor(sel.id)}
                    fvmWeighted={view.weightedFvmFor(sel.id)}
                    seasonStats={view.seasonStatsById.get(sel.id)}
                    lineupStatus={lineupStatusFor(sel, view.probableLineup)}
                    setPieceRanks={setPieceRanksFor(sel, view.setPieceTakers)}
                    tags={view.tagsFor(sel.id)}
                    attributes={view.attributesFor(sel.id)}
                  />
                </div>
                </div>
                <div className={`verdict-badge verdict-badge--${view.verdictTone}`}>
                  <span className="verdict-badge__kicker">Verdetto live</span>
                  <span className="verdict-badge__text">{view.verdict.text}</span>
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
                    {view.managers.map((m) => {
                      const full = !view.managerCanBuy(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={view.selectedManagerId === m.id ? "chip chip--on" : "chip"}
                          disabled={full}
                          title={full ? "Rosa completa per questo ruolo" : undefined}
                          onClick={() => view.onSelectManager(m.id)}
                        >
                          {m.name}
                        </button>
                      );
                    })}
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
              {view.roleBudgetImpact && (
                <div style={{ fontSize: 12, color: "var(--color-accent-2-700)" }}>
                  {view.roleBudgetImpact.text}
                </div>
              )}
              {view.strongRoleAlerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {view.strongRoleAlerts.map((a) => (
                    <span
                      key={a.managerId}
                      style={{ fontSize: 12, color: "var(--color-accent-2-700)" }}
                    >
                      {a.text}
                    </span>
                  ))}
                </div>
              )}
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
                  {view.compareRows.length} libere · ordinate per{" "}
                  {COMPARE_SORT_LABEL[view.compareSortKey]}
                </span>
              </div>
              <div
                className="seg"
                role="group"
                aria-label="Ordina alternative per"
                style={{ marginBottom: 8, flexWrap: "wrap" }}
              >
                {COMPARE_SORT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="seg-opt"
                    aria-pressed={view.compareSortKey === k}
                    onClick={() => view.onCompareSortKey(k)}
                  >
                    {COMPARE_SORT_LABEL[k]}
                  </button>
                ))}
              </div>
              {showAttributes && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-neutral-700)",
                    margin: "4px 0",
                    textAlign: "right",
                  }}
                >
                  Ovr / Pot / Età / Val — Attributi EA FC —{" "}
                  <a
                    href="https://sofifa.com/"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <img
                      src="/sofifa-logo-small.png"
                      alt=""
                      style={{ height: 12, width: "auto" }}
                    />
                    SoFIFA
                  </a>
                </div>
              )}
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
                      <th style={{ textAlign: "right" }}>
                        <InfoLabel {...COLUMN_GLOSSARY.fm} />
                      </th>
                      <th style={{ textAlign: "right" }}>
                        <InfoLabel {...COLUMN_GLOSSARY.score} />
                      </th>
                      <th style={{ textAlign: "right" }}>Δ vs in asta</th>
                      {showStats && (
                        <>
                          <th style={{ textAlign: "right" }}>Min</th>
                          <th style={{ textAlign: "right" }}>Gol</th>
                          <th style={{ textAlign: "right" }}>Ass</th>
                        </>
                      )}
                      {showAttributes && (
                        <>
                          <th style={{ textAlign: "right" }} title="Attributi EA FC — SoFIFA">
                            Ovr
                          </th>
                          <th style={{ textAlign: "right" }} title="Attributi EA FC — SoFIFA">
                            Pot
                          </th>
                          <th style={{ textAlign: "right" }} title="Attributi EA FC — SoFIFA">
                            Età
                          </th>
                          <th style={{ textAlign: "right" }} title="Attributi EA FC — SoFIFA">
                            Val
                          </th>
                        </>
                      )}
                      <th style={{ width: 90 }}>Dettagli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.compareRows.map(
                      ({
                        player,
                        valuation,
                        delta,
                        isCurrent,
                        seasonStats,
                        displayScore,
                        tags,
                        teamPref,
                      }) => {
                        const stats = view.enrichment?.performance.stats.find(
                          (s) => s.player_id === player.id,
                        );
                        const attrs = view.attributesFor(player.id);
                        const expanded = expandedPlayerId === player.id;
                        const columnCount = 11 + (showStats ? 3 : 0) + (showAttributes ? 4 : 0);
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
                                <span className="player-name-cell">
                                  <PlayerAvatar
                                    name={player.nome_completo ?? player.name}
                                    team={player.team}
                                    ruolo={player.ruolo}
                                    image_url={player.image_url}
                                    size="sm"
                                  />
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
                                    {player.nome_completo ?? player.name}
                                  </button>
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                >
                                  {player.team}
                                  <TeamPrefBadge pref={teamPref} variant="dot" />
                                </span>
                              </td>
                              <td style={{ fontWeight: 600, color: "var(--color-accent-700)" }}>
                                {valuation?.tier ?? "—"}
                                {tags.length > 0 && (
                                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                    {tags.map((t) => (
                                      <span
                                        key={t.id}
                                        className={t.id === "trappola" ? "tag tag-accent-2" : "tag tag-neutral"}
                                        style={{ fontWeight: 400 }}
                                      >
                                        {t.label}
                                      </span>
                                    ))}
                                  </span>
                                )}
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
                                style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                              >
                                {seasonStats?.fm ?? "—"}
                              </td>
                              <td className="num" style={{ textAlign: "right" }}>
                                {displayScore === null ? (
                                  <span style={{ color: "var(--color-neutral-800)" }}>—</span>
                                ) : (
                                  <button
                                    type="button"
                                    className="info-label__more"
                                    style={{ color: "var(--color-neutral-800)", fontWeight: 600 }}
                                    onClick={() => setBreakdownPlayerId(player.id)}
                                    title="Scomposizione punteggio"
                                  >
                                    {displayScore.toFixed(1)}
                                  </button>
                                )}
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
                                    style={{
                                      textAlign: "right",
                                      color: "var(--color-neutral-800)",
                                    }}
                                  >
                                    {stats?.minutes ?? "—"}
                                  </td>
                                  <td
                                    className="num"
                                    style={{
                                      textAlign: "right",
                                      color: "var(--color-neutral-800)",
                                    }}
                                  >
                                    {stats?.goals ?? "—"}
                                  </td>
                                  <td
                                    className="num"
                                    style={{
                                      textAlign: "right",
                                      color: "var(--color-neutral-800)",
                                    }}
                                  >
                                    {stats?.assists ?? "—"}
                                  </td>
                                </>
                              )}
                              {showAttributes && (
                                <>
                                  <td
                                    className="num"
                                    style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                  >
                                    {attrs?.overall ?? "—"}
                                  </td>
                                  <td
                                    className="num"
                                    style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                  >
                                    {attrs?.potential ?? "—"}
                                  </td>
                                  <td
                                    className="num"
                                    style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                  >
                                    {attrs?.age ?? "—"}
                                  </td>
                                  <td
                                    className="num"
                                    style={{ textAlign: "right", color: "var(--color-neutral-800)" }}
                                  >
                                    {attrs?.value ?? "—"}
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
                                    fvmWeighted={view.weightedFvmFor(player.id)}
                                    seasonStats={view.seasonStatsById.get(player.id)}
                                    lineupStatus={lineupStatusFor(player, view.probableLineup)}
                                    setPieceRanks={setPieceRanksFor(player, view.setPieceTakers)}
                                    tags={tags}
                                    attributes={view.attributesFor(player.id)}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      },
                    )}
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
            <GkPairingHint
              suggestion={view.gkPairingSuggestion}
              onFilterTeam={(team) => {
                view.onRoleFilter("P");
                view.onQuery(team);
              }}
            />
            <div className="io-maxbid">
              <div className="io-maxbid__n">{me?.adjustedMaxBid ?? 0}</div>
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

          {me && me.spentByRole.length > 0 && (
            <div>
              <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
                Budget per reparto
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {me.spentByRole.map((rb) => {
                  const warn = rb.state !== "ok";
                  const over = rb.state === "over";
                  return (
                    <div
                      key={rb.ruolo}
                      style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}
                    >
                      <span
                        className="role-tag"
                        style={{ width: 18, color: roleColor(rb.ruolo) }}
                      >
                        {rb.ruolo}
                      </span>
                      <span
                        className="num"
                        style={{ flex: 1, color: "var(--color-neutral-800)" }}
                        title="speso / obiettivo di reparto"
                      >
                        {rb.spent}/{rb.targetCredits}
                      </span>
                      <span
                        className="num"
                        style={{
                          fontWeight: 600,
                          color: warn ? "var(--color-accent-2-700)" : undefined,
                        }}
                      >
                        {over ? `overbudget ${rb.residuo}` : `res ${rb.residuo}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
              Avversari{sel ? ` · max su ${sel.nome_completo ?? sel.name}` : ""}
            </h6>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {view.opponents.map((o) => (
                <div key={o.managerId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <span className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
                      {o.name}
                    </span>
                    <span className="num" style={{ color: "var(--color-neutral-800)" }}>
                      res {o.residuo}
                    </span>
                    <span className="num" style={{ fontWeight: 600 }}>
                      max {o.maxOnCurrent}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {o.freeSlots.map((s) => (
                      <span
                        key={s.ruolo}
                        style={{ fontSize: 11, color: "var(--color-neutral-700)" }}
                        className="num"
                      >
                        <span style={{ color: roleColor(s.ruolo), fontWeight: 600 }}>{s.ruolo}</span>{" "}
                        {Math.max(s.free, 0)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {view.opponents.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                  Nessun avversario.
                </span>
              )}
            </div>
            {view.opponentRosterCards.length > 0 && (
              <button
                type="button"
                onClick={() => setOpponentsDialogOpen(true)}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: 11,
                  border: 0,
                  borderRadius: "var(--radius-md)",
                  background: "#0b0e14",
                  color: "#fff",
                  font: "700 13px var(--font-heading)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                Rose avversari &amp; crediti residui
                <span
                  className="num"
                  style={{
                    fontSize: 11,
                    background: "var(--color-accent)",
                    padding: "2px 7px",
                    borderRadius: 6,
                  }}
                >
                  {view.opponentRosterCards.length}
                </span>
              </button>
            )}
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
            <div className="log-scroll" style={{ display: "flex", flexDirection: "column" }}>
              {view.logRows.map((l) => (
                <div className="log-row" key={l.key}>
                  <PlayerAvatar
                    name={l.name}
                    team={l.team}
                    ruolo={l.ruolo}
                    image_url={l.imageUrl}
                    size="sm"
                  />
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
                  <button
                    type="button"
                    className="log-del"
                    title="Annulla questa chiamata"
                    aria-label={`Annulla la chiamata di ${l.name}`}
                    onClick={() => view.onDeleteCall(l.playerId)}
                  >
                    🗑
                  </button>
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

      {breakdownRec && (
        <ScoreBreakdownDialog
          player={breakdownRec}
          normalizedScore={view.normalizedScoreFor(breakdownRec.player_id)}
          onClose={() => setBreakdownPlayerId(null)}
        />
      )}

      {opponentsDialogOpen && (
        <OpponentRosterDialog
          cards={view.opponentRosterCards}
          calledRole={sel?.ruolo ?? null}
          imageUrlFor={view.playerImageFor}
          onClose={() => setOpponentsDialogOpen(false)}
        />
      )}
    </div>
  );
}
