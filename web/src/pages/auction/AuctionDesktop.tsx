import { useState } from "react";
import { AlternativesPanel } from "../../components/AlternativesPanel";
import { GkPairingHint } from "../../components/GkPairingHint";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import { OpponentsBoard } from "./OpponentsBoard";
import { PurchaseLogDialog } from "./PurchaseLogDialog";
import { ModifierWarning } from "../../components/ModifierWarning";
import { PlayerDetailPanel } from "../../components/PlayerDetailPanel";
import { SameTeamGoalkeepers } from "../../components/SameTeamGoalkeepers";
import { ScoutingNote } from "../../components/ScoutingNote";
import { TeamPrefBadge } from "../../components/ui/TeamPrefBadge";
import { WarningBadge } from "../../components/WarningBadge";
import {
  COLOR_WARN,
  ROLE_LABEL,
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
  const [callColCollapsed, setCallColCollapsed] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

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

      <div className={callColCollapsed ? "auction-grid auction-grid--call-collapsed" : "auction-grid"}>
        {/* Colonna 1 — chiamata */}
        <section className={callColCollapsed ? "call-col call-col--collapsed" : "call-col"}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {!callColCollapsed && (
              <h6 style={{ margin: 0, color: "var(--color-neutral-700)" }}>
                Chiamata · {view.availableCount} liberi
              </h6>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              aria-expanded={!callColCollapsed}
              aria-label={callColCollapsed ? "Espandi colonna chiamata" : "Comprimi colonna chiamata"}
              onClick={() => setCallColCollapsed((v) => !v)}
            >
              {callColCollapsed ? "›" : "‹"}
            </button>
          </div>
          {!callColCollapsed && (
            <>
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
            </>
          )}
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
                  {view.ladder && (
                    <div className="bid-name-ladder">
                      <div className="ladder ladder--compact" data-testid="price-ladder">
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
                          const row = t.row === 1 ? 22 : 0;
                          return (
                            <span
                              key={t.key}
                              style={{ position: "absolute", top: 0, left: `${t.pct}%` }}
                            >
                              <span
                                className="ladder-tick-line"
                                style={{
                                  width: t.accent ? 2 : 1,
                                  height: 12 + row,
                                  background: t.accent
                                    ? "var(--color-accent)"
                                    : "var(--color-neutral-600)",
                                }}
                              />
                              <span className="ladder-label" style={{ top: 10 + row }}>
                                {t.label}
                              </span>
                              <span className="ladder-value" style={{ top: 21 + row }}>
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
                            <span
                              className="ladder-price"
                              style={{ color: view.verdict.color }}
                            >
                              {view.priceNum ?? "—"}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                  {sel.ruolo === "P" && (
                    <SameTeamGoalkeepers goalkeepers={view.sameTeamGoalkeepers} />
                  )}
                  <AlternativesPanel
                    key={`${sel.id}:${view.compareSortKey}`}
                    view={view}
                  />
                </div>
                </div>
                <div className={`verdict-badge verdict-badge--${view.verdictTone}`}>
                  <span className="verdict-badge__kicker">Verdetto live</span>
                  <span className="verdict-badge__text">{view.verdict.text}</span>
                </div>
              </div>

              {view.selectedNote && (
                <ScoutingNote
                  note={view.selectedNote}
                  highlighted={view.verdictTone === "over"}
                />
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
              {/* Testo solo quando non è un avviso: gli avvisi (max bid superato/slot
                  pieni, quota di reparto, giocatori forti presi) compaiono come
                  badge lampeggiante accanto al nome del manager coinvolto — vedi
                  "Io" qui sopra e i nomi in "Avversari" sotto. */}
              {!view.assignError && view.impact.color !== COLOR_WARN && (
                <div className="bid-impact" style={{ color: view.impact.color }}>
                  {view.impact.text}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px 0" }}>
              <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>Nessun giocatore in asta</h1>
              <p style={{ maxWidth: "46ch", color: "var(--color-neutral-800)" }}>
                Scrivi un nome nella colonna di sinistra, oppure premi ↓ per prendere il primo della
                lista. Il confronto con le alternative dello stesso ruolo compare accanto al giocatore.
              </p>
            </div>
          )}

          <div className="bid-opponents">
            <h6 className="bid-opponents__title">
              Avversari{sel ? ` · max su ${sel.nome_completo ?? sel.name}` : ""}
            </h6>
            <OpponentsBoard
              cards={view.opponentRosterCards}
              calledRole={sel?.ruolo ?? null}
              onDeletePurchase={view.onDeletePurchase}
              onReassignPurchase={view.onReassignPurchase}
              onUpdatePurchasePrice={view.onUpdatePurchasePrice}
              warningsFor={view.warningsFor}
              reassignError={view.reassignError}
            />
          </div>
        </section>

        {/* Colonna 3 — io */}
        <aside className="io-col">
          <div>
            <h6 style={{ margin: "0 0 18px", color: "var(--color-neutral-700)" }}>
              Io
              {me && <WarningBadge warnings={view.warningsFor(me.managerId)} />}
            </h6>
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

          {view.myRoster.length > 0 && (
            <div>
              <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
                Rosa
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {view.myRoster.map((g) => (
                  <div key={g.ruolo}>
                    <div
                      className="role-tag"
                      style={{ fontSize: 11, marginBottom: 3, color: roleColor(g.ruolo) }}
                    >
                      {g.ruolo}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {g.players.map((p) => (
                        <div
                          key={p.player_id}
                          style={{ display: "flex", gap: 8, fontSize: 12 }}
                        >
                          <span
                            className="ellipsis"
                            style={{ flex: 1, minWidth: 0, color: "var(--color-neutral-800)" }}
                          >
                            {p.name}
                          </span>
                          <span className="num" style={{ fontWeight: 600 }}>{p.prezzo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <h6 style={{ margin: "0 0 8px", color: "var(--color-neutral-700)" }}>Chiamate</h6>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setLogOpen(true)}
              >
                Log acquisti
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={view.onUndo}
              >
                Annulla ultima
              </button>
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

      {logOpen && (
        <PurchaseLogDialog
          rows={view.logRows}
          onDeleteCall={view.onDeleteCall}
          onUndo={view.onUndo}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}
