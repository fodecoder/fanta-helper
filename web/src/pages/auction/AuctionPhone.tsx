import { useState } from "react";
import { AlternativesPanel } from "../../components/AlternativesPanel";
import { GkPairingHint } from "../../components/GkPairingHint";
import { ModifierWarning } from "../../components/ModifierWarning";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import { PlayerDetailPanel } from "../../components/PlayerDetailPanel";
import { SameTeamGoalkeepers } from "../../components/SameTeamGoalkeepers";
import { ScoutingNote } from "../../components/ScoutingNote";
import { TeamPrefBadge } from "../../components/ui/TeamPrefBadge";
import { WarningBadge } from "../../components/WarningBadge";
import { OpponentsBoard } from "./OpponentsBoard";
import {
  COLOR_WARN,
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

const SHORT_LABEL: Record<string, string> = {
  Target: "TGT",
  "Fair value": "FV",
  "Max bid": "MAX",
  Panic: "PANIC",
};

type Tab = "lista" | "alternative" | "log";

export function AuctionPhone({ view }: { view: AuctionView }) {
  const [tab, setTab] = useState<Tab>("lista");
  const [opponentsOpen, setOpponentsOpen] = useState(false);
  const [myRosterOpen, setMyRosterOpen] = useState(false);
  const { selectedPlayer: sel, selectedValuation: val, me } = view;
  const freeSlots = me ? me.slots.reduce((s, x) => s + Math.max(x.free, 0), 0) : 0;
  const selectedManagerName =
    view.managers.find((m) => m.id === view.selectedManagerId)?.name ?? "—";

  return (
    <div className="auction-phone">
      <div className="phone-top">
        <div className="phone-top-row">
          <span className="auction-live" style={{ fontSize: 9 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Asta live
          </span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-300)" }}>
            {view.league.name}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-neutral-300)" }}>
            {view.callsLabel}
          </span>
          <button type="button" className="btn btn-secondary phone-exit" onClick={view.onExit}>
            Esci
          </button>
        </div>
        <div className="rule-heavy" style={{ height: 2, margin: "8px 0 1px" }} />
        <div className="rule-thin" style={{ marginBottom: 10 }} />
        <ModifierWarning
          modificatori={view.league.modificatori}
          className="modifier-warning--tight"
        />
        <GkPairingHint
          suggestion={view.gkPairingSuggestion}
          onFilterTeam={(team) => {
            view.onRoleFilter("P");
            view.onQuery(team);
          }}
          className="gk-pairing-hint--tight"
        />
        <div className="phone-figures">
          <div>
            <div className="phone-maxbid">{me?.adjustedMaxBid ?? 0}</div>
            <div className="phone-fig-label">Max bid rett.</div>
          </div>
          <div>
            <div className="phone-fig-n">{me?.residuo ?? 0}</div>
            <div className="phone-fig-label">Residuo</div>
          </div>
          <div>
            <div className="phone-fig-n">{freeSlots}</div>
            <div className="phone-fig-label">Slot liberi</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              alignItems: "flex-end",
            }}
          >
            {(me?.slots ?? []).map((s) => (
              <div key={s.ruolo} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span className="role-tag" style={{ color: roleColor(s.ruolo) }}>
                  {s.ruolo}
                </span>
                <span style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: s.total }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        background: i < s.used ? roleColor(s.ruolo) : "var(--color-neutral-300)",
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {me && me.spentByRole.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            padding: "6px 12px",
            fontSize: 12,
          }}
        >
          {me.spentByRole.map((rb) => (
            <span
              key={rb.ruolo}
              style={{
                display: "flex",
                gap: 4,
                color: rb.state !== "ok" ? "var(--color-accent-2-700)" : undefined,
              }}
            >
              <span className="role-tag" style={{ color: roleColor(rb.ruolo) }}>
                {rb.ruolo}
              </span>
              <span className="num">
                {rb.spent}/{rb.targetCredits}
              </span>
              <span className="num" style={{ fontWeight: 600 }}>
                {rb.state === "over" ? `(over ${rb.residuo})` : `(${rb.residuo})`}
              </span>
            </span>
          ))}
        </div>
      )}

      {view.myRoster.length > 0 && (
        <div style={{ padding: "0 12px 6px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ minHeight: 36, fontSize: 12 }}
            aria-expanded={myRosterOpen}
            onClick={() => setMyRosterOpen((v) => !v)}
          >
            {myRosterOpen ? "▾" : "▸"} Rosa (
            {view.myRoster.reduce((n, g) => n + g.players.length, 0)})
          </button>
          {myRosterOpen && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
              {view.myRoster.map((g) => (
                <div key={g.ruolo}>
                  <span className="role-tag" style={{ fontSize: 11, color: roleColor(g.ruolo) }}>
                    {g.ruolo}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
                    {g.players.map((p) => (
                      <div key={p.player_id} style={{ display: "flex", gap: 8, fontSize: 12 }}>
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
          )}
        </div>
      )}

      <div className="phone-bid">
        {sel ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PlayerAvatar
                name={sel.nome_completo ?? sel.name}
                team={sel.team}
                ruolo={sel.ruolo}
                image_url={sel.image_url}
                size="lg"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  className="auction-live"
                  style={{ color: "var(--color-accent)", fontSize: 9 }}
                >
                  In asta
                </span>
                <h1 className="phone-bid-name" style={{ margin: "2px 0 0" }}>
                  {sel.nome_completo ?? sel.name}
                </h1>
              </div>
              <span className={`verdict-pill verdict-pill--${view.verdictTone}`}>
                {view.verdict.text}
              </span>
            </div>
            {view.selectedNote && (
              <ScoutingNote note={view.selectedNote} highlighted={view.verdictTone === "over"} />
            )}
            <div style={{ fontSize: 13, color: "var(--color-neutral-800)", marginTop: 4 }}>
              {sel.team}
              {val &&
                ` · tier ${val.tier} · fv ${val.fair_value} · target ${val.target} · panic ${val.panic_price}`}
            </div>
            {view.ladder && (
              <div
                className="ladder ladder--compact"
                data-testid="price-ladder"
                style={{ margin: "20px 12px 34px 4px" }}
              >
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
                  const row = t.row === 1 ? 20 : 0;
                  return (
                    <span key={t.key} style={{ position: "absolute", top: 0, left: `${t.pct}%` }}>
                      <span
                        className="ladder-tick-line"
                        style={{
                          width: t.accent ? 2 : 1,
                          height: 11 + row,
                          background: t.accent ? "var(--color-accent)" : "var(--color-neutral-600)",
                        }}
                      />
                      <span className="ladder-label" style={{ top: 9 + row }}>
                        {SHORT_LABEL[t.label] ?? t.label}
                      </span>
                      <span className="ladder-value" style={{ top: 18 + row }}>
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
                      height: 24,
                      top: -11,
                      background: view.verdict.color,
                    }}
                  >
                    <span
                      className="ladder-price"
                      style={{ bottom: 10, fontSize: 13, color: view.verdict.color }}
                    >
                      {view.priceNum ?? "—"}
                    </span>
                  </span>
                )}
              </div>
            )}
            <TeamPrefBadge pref={view.teamPrefFor(sel.id)} variant="banner" />
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

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input"
                style={{
                  width: 116,
                  minHeight: 48,
                  font: "600 22px/1 var(--font-heading)",
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "center",
                }}
                type="number"
                min={0}
                placeholder="prezzo"
                value={view.price}
                onChange={(e) => view.onPrice(e.target.value)}
              />
              {view.bumps.map((d) => (
                <button key={d} type="button" className="phone-bump" onClick={() => view.onBump(d)}>
                  {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
                </button>
              ))}
            </div>

            <div className="phone-chip-scroll">
              {view.managers.map((m) => {
                const full = !view.managerCanBuy(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={view.selectedManagerId === m.id ? "chip chip--on" : "chip"}
                    style={{ whiteSpace: "nowrap", minHeight: 36 }}
                    disabled={full}
                    title={full ? "Rosa completa per questo ruolo" : undefined}
                    onClick={() => view.onSelectManager(m.id)}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ minHeight: 50, fontSize: 17, marginTop: 8 }}
              onClick={view.onAssign}
              disabled={!view.canAssign}
            >
              Assegna a {selectedManagerName}
            </button>
            {view.selectedManagerId !== null && (
              <div style={{ marginTop: 4 }}>
                <WarningBadge warnings={view.warningsFor(view.selectedManagerId)} />
              </div>
            )}
            {/* Testo solo quando non è un avviso: gli avvisi (max bid superato/slot
                pieni, quota di reparto, giocatori forti presi) compaiono come badge
                lampeggiante qui sopra e sui nomi avversario più sotto. */}
            {!view.assignError && view.impact.color !== COLOR_WARN && (
              <div
                style={{
                  fontSize: 12,
                  color: view.impact.color,
                  marginTop: 7,
                  minHeight: 32,
                  lineHeight: 1.35,
                }}
              >
                {view.impact.text}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ minHeight: 40 }}
                aria-expanded={opponentsOpen}
                onClick={() => setOpponentsOpen((v) => !v)}
              >
                {opponentsOpen ? "▾" : "▸"} Avversari ({view.opponents.length})
              </button>
              {opponentsOpen && (
                <div style={{ marginTop: 8 }}>
                  <OpponentsBoard
                    cards={view.opponentRosterCards}
                    calledRole={sel?.ruolo ?? null}
                    onDeletePurchase={view.onDeletePurchase}
                    onUpdatePurchasePrice={view.onUpdatePurchasePrice}
                    warningsFor={view.warningsFor}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: "8px 0" }}>
            <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>Nessun giocatore in asta</h1>
            <p style={{ fontSize: 13, color: "var(--color-neutral-800)", margin: 0 }}>
              Apri la Lista e tocca un giocatore.
            </p>
          </div>
        )}
      </div>

      <div className="phone-tabs">
        {(["lista", "alternative", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="phone-tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "lista" ? "Lista" : t === "alternative" ? "Alternative" : "Log"}
          </button>
        ))}
      </div>

      <div className="phone-panel">
        {tab === "lista" && (
          <div>
            <div
              style={{ padding: "10px 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <input
                className="input"
                style={{ minHeight: 44, fontSize: 16 }}
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
            </div>
            {view.visiblePlayers.map((p) => {
              const on = p.id === sel?.id;
              const starred = view.wishlistPlayerIds.has(p.id);
              const pv = view.valuationFor(p.id);
              return (
                <div className="call-row" key={p.id}>
                  <button
                    type="button"
                    className={on ? "call-pick call-pick--on" : "call-pick"}
                    style={{ minHeight: 48, paddingLeft: 12 }}
                    onClick={() => view.onSelect(p.id)}
                  >
                    <span
                      className="call-mark"
                      style={{
                        background: on ? "var(--color-accent)" : roleColor(p.ruolo),
                        opacity: on ? 1 : 0.5,
                      }}
                    />
                    <span className="call-tier">{pv?.tier ?? ""}</span>
                    <span className="call-name-cell">
                      <span className="call-name ellipsis" style={{ fontSize: 15 }}>
                        {p.name}
                      </span>
                      <span className="call-team ellipsis">{p.team}</span>
                    </span>
                    <TeamPrefBadge pref={view.teamPrefFor(p.id)} variant="dot" />
                    <span className="call-fv" style={{ width: 36 }}>
                      {view.sortValueFor(p.id) ?? "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={starred ? "star-btn star-btn--on" : "star-btn"}
                    style={{ width: 48, fontSize: 18 }}
                    onClick={() => view.onToggleWishlist(p.id)}
                  >
                    {starred ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "alternative" && (
          <div style={{ padding: "12px 16px" }}>
            {sel ? (
              <AlternativesPanel
                key={`${sel.id}:${view.compareSortKey}`}
                view={view}
              />
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-neutral-700)", margin: 0 }}>
                Nessun giocatore in asta.
              </p>
            )}
          </div>
        )}

        {tab === "log" && (
          <div>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                {view.callsLabel}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginLeft: "auto", minHeight: 44 }}
                onClick={view.onUndo}
              >
                Annulla ultima
              </button>
            </div>
            {view.logRows.map((l) => (
              <div
                key={l.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 16px",
                  borderBottom: "1px solid var(--color-neutral-100)",
                }}
              >
                <PlayerAvatar
                  name={l.name}
                  team={l.team}
                  ruolo={l.ruolo}
                  image_url={l.imageUrl}
                  size="sm"
                />
                <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                  {l.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{l.manager}</span>
                <span className="num" style={{ fontWeight: 600, fontSize: 15 }}>
                  {l.prezzo}
                </span>
                <span
                  className="num"
                  style={{
                    fontSize: 11,
                    width: 36,
                    textAlign: "right",
                    color: l.delta === null ? "var(--color-neutral-700)" : deltaColor(l.delta),
                  }}
                >
                  {l.delta === null ? "—" : formatDelta(l.delta)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "6px 8px", fontSize: 15 }}
                  aria-label={`Annulla la chiamata di ${l.name}`}
                  onClick={() => view.onDeleteCall(l.playerId)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
