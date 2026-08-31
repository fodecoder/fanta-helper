import { useState } from "react";
import { GkPairingHint } from "../../components/GkPairingHint";
import { ModifierWarning } from "../../components/ModifierWarning";
import { PlayerDetailPanel } from "../../components/PlayerDetailPanel";
import { TeamPrefBadge } from "../../components/ui/TeamPrefBadge";
import {
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
const SHORT_LABEL: Record<string, string> = {
  Target: "TGT",
  "Fair value": "FV",
  "Max bid": "MAX",
  Panic: "PANIC",
};

type Tab = "lista" | "alternative" | "log";

// Il punteggio motore non è mai un intero: arrotondato per la lettura,
// gli altri valori (fair value, target, Qt.A, FVM) restano interi as-is.
function formatCompareValue(v: number | null): string {
  if (v === null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function AuctionPhone({ view }: { view: AuctionView }) {
  const [tab, setTab] = useState<Tab>("lista");
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const { selectedPlayer: sel, selectedValuation: val, me } = view;
  const freeSlots = me ? me.slots.reduce((s, x) => s + Math.max(x.free, 0), 0) : 0;
  const selectedManagerName =
    view.managers.find((m) => m.id === view.selectedManagerId)?.name ?? "—";

  return (
    <div className="auction-phone">
      <div className="phone-top">
        <div className="phone-top-row">
          <span className="auction-live" style={{ fontSize: 9 }}>
            Asta live
          </span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
            {view.league.name}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-neutral-700)" }}>
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

      <div className="phone-bid">
        {sel ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="auction-live" style={{ color: "var(--color-accent)", fontSize: 9 }}>
                In asta
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  font: "600 13px/1 var(--font-heading)",
                  color: view.verdict.color,
                }}
              >
                {view.verdict.text}
              </span>
            </div>
            <h1 className="phone-bid-name">{sel.nome_completo ?? sel.name}</h1>
            <div style={{ fontSize: 13, color: "var(--color-neutral-800)" }}>
              {sel.team}
              {val &&
                ` · tier ${val.tier} · fv ${val.fair_value} · target ${val.target} · panic ${val.panic_price}`}
            </div>
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

            {view.ladder && (
              <div className="ladder" style={{ margin: "30px 16px 58px 6px" }}>
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
                  const row = t.row === 1 ? 30 : 0;
                  return (
                    <span key={t.key} style={{ position: "absolute", top: 0, left: `${t.pct}%` }}>
                      <span
                        className="ladder-tick-line"
                        style={{
                          width: t.accent ? 2 : 1,
                          height: 12 + row,
                          background: t.accent ? "var(--color-accent)" : "var(--color-neutral-600)",
                        }}
                      />
                      <span className="ladder-label" style={{ top: 10 + row }}>
                        {SHORT_LABEL[t.label] ?? t.label}
                      </span>
                      <span className="ladder-value" style={{ top: 22 + row }}>
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
                      height: 30,
                      top: -14,
                      background: view.verdict.color,
                    }}
                  >
                    <span
                      className="ladder-price"
                      style={{ bottom: 12, fontSize: 17, color: view.verdict.color }}
                    >
                      {view.priceNum ?? "—"}
                    </span>
                  </span>
                )}
              </div>
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
              {view.managers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={view.selectedManagerId === m.id ? "chip chip--on" : "chip"}
                  style={{ whiteSpace: "nowrap", minHeight: 36 }}
                  onClick={() => view.onSelectManager(m.id)}
                >
                  {m.name}
                </button>
              ))}
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
            <div
              style={{
                fontSize: 12,
                color: view.assignError ? "var(--color-accent-2-700)" : view.impact.color,
                marginTop: 7,
                minHeight: 32,
                lineHeight: 1.35,
              }}
            >
              {view.assignError ?? view.impact.text}
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
                    <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                      {p.nome_completo ?? p.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                      {p.team}
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
          <div>
            <div
              style={{ padding: "12px 16px 6px", fontSize: 12, color: "var(--color-neutral-700)" }}
            >
              {sel
                ? `${view.compareRows.length} libere · ordinate per ${COMPARE_SORT_LABEL[view.compareSortKey]}`
                : "Nessun giocatore in asta."}
            </div>
            {sel && (
              <div
                className="seg"
                role="group"
                aria-label="Ordina alternative per"
                style={{ margin: "0 16px 8px", flexWrap: "wrap" }}
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
            )}
            {view.compareRows.map(({ player, valuation, delta, tags, teamPref, displayScore }) => {
              const expanded = expandedPlayerId === player.id;
              return (
                <div
                  key={player.id}
                  style={{
                    borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => view.onSelect(player.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: 0,
                      padding: "11px 16px",
                      cursor: "pointer",
                      color: "var(--color-text)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span
                        style={{
                          font: "600 11px/1 var(--font-heading)",
                          color: "var(--color-accent-700)",
                          width: 24,
                        }}
                      >
                        {valuation?.tier ?? ""}
                      </span>
                      <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                        {player.name}
                      </span>
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
                      <span
                        className="num"
                        style={{ fontWeight: 600, fontSize: 15, width: 38, textAlign: "right" }}
                      >
                        {view.compareSortKey === "score" && displayScore !== null
                          ? displayScore.toFixed(1)
                          : formatCompareValue(view.compareSortValueFor(player.id))}
                      </span>
                      <span
                        className="num"
                        style={{
                          fontSize: 12,
                          width: 40,
                          textAlign: "right",
                          color: delta === null ? "var(--color-neutral-700)" : deltaColor(delta),
                        }}
                      >
                        {delta === null ? "—" : formatDelta(delta)}
                      </span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                      <span className="bar-track" style={{ flex: 1, height: 6 }}>
                        <span
                          className="bar-fill"
                          style={{
                            width: `${Math.round(((valuation?.fair_value ?? 0) / view.compareMaxFv) * 100)}%`,
                            background: "var(--color-neutral-600)",
                          }}
                        />
                      </span>
                      <span
                        style={{ fontSize: 11, color: "var(--color-neutral-700)" }}
                        className="num"
                      >
                        max {valuation?.max_bid ?? "—"} · panic {valuation?.panic_price ?? "—"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ margin: "0 16px 10px", padding: "3px 10px", fontSize: 12 }}
                    onClick={() => setExpandedPlayerId(expanded ? null : player.id)}
                  >
                    {expanded ? "Chiudi" : "Dettagli"}
                  </button>
                  {expanded && (
                    <div style={{ padding: "0 16px 10px" }}>
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
                    </div>
                  )}
                </div>
              );
            })}
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
                  alignItems: "baseline",
                  gap: 9,
                  padding: "11px 16px",
                  borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                }}
              >
                <span className="log-dot" style={{ background: roleColor(l.ruolo) }} />
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
