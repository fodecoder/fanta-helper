import { useEffect, useMemo, useState } from "react";
import type {
  League,
  ManagerAuctionStatus,
  PurchaseWithDetails,
  ValuationWithPlayer,
  WishlistEntryWithPlayer,
} from "@fanta-helper/shared";
import {
  ROLES,
  explainAdjustedMaxBid,
  scaleValuationAmounts,
  valuationScaleFactor,
} from "@fanta-helper/shared";
import * as purchasesApi from "../api/purchases";
import * as valuationsApi from "../api/valuations";
import * as wishlistApi from "../api/wishlist";
import { ModifierWarning } from "../components/ModifierWarning";
import { PageMasthead } from "../components/shell/PageMasthead";
import { UserAvatar } from "../components/UserAvatar";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { StatFigure } from "../components/StatFigure";
import { StatusMessage } from "../components/StatusMessage";
import { deltaColor, formatDelta, roleColor } from "../lib/auctionDerivations";
import { Dialog } from "../components/ui/Dialog";
import { InfoLabel } from "../components/ui/InfoLabel";
import { COLUMN_GLOSSARY } from "../lib/columnGlossary";

interface OverviewPageProps {
  league: League;
  calls: number | null;
}

export function OverviewPage({ league, calls }: OverviewPageProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[] | null>(null);
  const [statuses, setStatuses] = useState<ManagerAuctionStatus[] | null>(null);
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [wishlist, setWishlist] = useState<WishlistEntryWithPlayer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxBidDetailManagerId, setMaxBidDetailManagerId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fail = (err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(err instanceof Error ? err.message : "caricamento fallito");
    };
    void purchasesApi.listPurchases(league.id, controller.signal).then(setPurchases).catch(fail);
    void purchasesApi.getAuctionState(league.id, controller.signal).then(setStatuses).catch(fail);
    void valuationsApi.listValuations(league.id, controller.signal).then(setValuations).catch(fail);
    void wishlistApi.listWishlist(league.id, controller.signal).then(setWishlist).catch(fail);
    return () => controller.abort();
  }, [league.id]);

  const purchasedPlayerIds = useMemo(
    () => new Set((purchases ?? []).map((p) => p.player_id)),
    [purchases],
  );
  // Le valutazioni importate sono su base 1000 crediti: si riscalano qui per
  // il budget reale della lega (vedi shared/src/valuationScale.ts).
  const valuationScale = valuationScaleFactor(league.budget);
  const valuationById = useMemo(() => {
    const map = new Map<number, ValuationWithPlayer>();
    for (const v of valuations ?? []) map.set(v.player_id, scaleValuationAmounts(v, valuationScale));
    return map;
  }, [valuations, valuationScale]);

  const me = statuses?.find((s) => s.isOwner);
  const myFreeSlots = me ? me.slots.reduce((sum, s) => sum + Math.max(s.free, 0), 0) : 0;
  const leagueSpent = (statuses ?? []).reduce((sum, s) => sum + s.spent, 0);

  const wishRows = (wishlist ?? [])
    .filter((entry) => !purchasedPlayerIds.has(entry.player_id))
    .map((entry) => {
      const val = valuationById.get(entry.player_id);
      return {
        player_id: entry.player_id,
        name: entry.name,
        team: entry.team,
        ruolo: entry.ruolo,
        fv: val?.fair_value ?? null,
        max: val?.max_bid ?? null,
      };
    });

  const logRows = (purchases ?? [])
    .slice()
    .reverse()
    .slice(0, 8)
    .map((p) => {
      const val = valuationById.get(p.player_id);
      const delta = val ? p.prezzo - val.fair_value : null;
      return {
        key: `${p.league_id}-${p.player_id}`,
        name: p.player_name,
        manager: p.manager_name,
        prezzo: p.prezzo,
        delta,
      };
    });

  return (
    <>
      <PageMasthead
        kicker="Panoramica lega · asta in corso"
        title={league.name}
        subtitle={
          <>
            Tutto lo stato è derivato dal log degli acquisti: {calls ?? 0} chiamate registrate,
            nessuno stato duplicato. Da qui entri in asta; il resto è configurazione.
          </>
        }
        calls={calls}
      />

      <ModifierWarning modificatori={league.modificatori} />

      {loadError && <StatusMessage kind="error">{loadError}</StatusMessage>}

      <div className="stat-figures" style={{ marginBottom: 44 }}>
        <StatFigure label="Il mio residuo" value={me?.residuo ?? 0} />
        <StatFigure
          label={<InfoLabel label="Max bid rettificato" tooltip={COLUMN_GLOSSARY.adjustedMaxBid.tooltip} />}
          value={me?.adjustedMaxBid ?? 0}
        />
        <StatFigure label="Slot liberi" value={myFreeSlots} />
        <StatFigure label="Speso in lega" value={leagueSpent} />
      </div>

      <h3 style={{ margin: "0 0 10px" }}>Stato dei manager</h3>
      {statuses === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : (
        <div className="table-scroll" style={{ marginBottom: 44 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Manager</th>
                <th style={{ textAlign: "right" }}>Speso</th>
                <th style={{ textAlign: "right" }}>Residuo</th>
                <th style={{ width: 170 }}>Budget consumato</th>
                {ROLES.map((r) => (
                  <th key={r}>{r}</th>
                ))}
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.adjustedMaxBid} />
                </th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => {
                const isMe = s.isOwner;
                const pct = s.budget > 0 ? Math.round((s.spent / s.budget) * 100) : 0;
                return (
                  <tr key={s.managerId}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      <span className="mgr-name-cell">
                        {s.userName ? (
                          <UserAvatar
                            size="sm"
                            user={{
                              username: s.userName,
                              avatar: s.userAvatar ?? null,
                              avatar_color: s.userAvatarColor ?? null,
                            }}
                          />
                        ) : (
                          <span className={isMe ? "mgr-dot mgr-dot--me" : "mgr-dot"} />
                        )}
                        {s.managerName}
                      </span>
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {s.spent}
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {s.residuo}
                    </td>
                    <td>
                      <span className="bar-track">
                        <span
                          className="bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: isMe ? "var(--color-accent)" : "var(--color-neutral-600)",
                          }}
                        />
                      </span>
                    </td>
                    {ROLES.map((r) => {
                      const slot = s.slots.find((x) => x.ruolo === r);
                      return (
                        <td key={r} className="num" style={{ color: "var(--color-neutral-800)" }}>
                          {slot ? `${slot.used}/${slot.total}` : "—"}
                        </td>
                      );
                    })}
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "2px 8px", fontSize: 12 }}
                        onClick={() => setMaxBidDetailManagerId(s.managerId)}
                      >
                        {s.adjustedMaxBid} ⓘ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="two-col">
        <div>
          <h3 style={{ margin: "0 0 10px" }}>Obiettivi ancora liberi</h3>
          {wishRows.length === 0 ? (
            <StatusMessage kind="empty">Nessun obiettivo in wishlist ancora libero.</StatusMessage>
          ) : (
            <div className="table-scroll">
              <table className="table" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th>Giocatore</th>
                    <th>Ruolo</th>
                    <th style={{ textAlign: "right" }}>Fair value</th>
                    <th style={{ textAlign: "right" }}>Max bid</th>
                  </tr>
                </thead>
                <tbody>
                  {wishRows.map((w) => (
                    <tr key={w.player_id}>
                      <td className="ellipsis">
                        <span className="player-name-cell">
                          <PlayerAvatar name={w.name} team={w.team} ruolo={w.ruolo} size="sm" />
                          <span className="ellipsis">
                            {w.name}{" "}
                            <span className="text-muted" style={{ fontSize: 12 }}>
                              {w.team}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td style={{ color: roleColor(w.ruolo) }}>{w.ruolo}</td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {w.fv ?? "—"}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {w.max ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 style={{ margin: "0 0 10px" }}>Ultime chiamate</h3>
          {logRows.length === 0 ? (
            <StatusMessage kind="empty">Nessuna chiamata registrata.</StatusMessage>
          ) : (
            <div className="table-scroll">
              <table className="table" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th>Giocatore</th>
                    <th>A</th>
                    <th style={{ textAlign: "right" }}>Prezzo</th>
                    <th style={{ textAlign: "right" }}>
                      <InfoLabel {...COLUMN_GLOSSARY.vsFv} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logRows.map((l) => (
                    <tr key={l.key}>
                      <td className="ellipsis">{l.name}</td>
                      <td className="ellipsis">{l.manager}</td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {l.prezzo}
                      </td>
                      <td
                        className="num"
                        style={{
                          textAlign: "right",
                          color: l.delta === null ? undefined : deltaColor(l.delta),
                        }}
                      >
                        {l.delta === null ? "—" : formatDelta(l.delta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const s = (statuses ?? []).find((x) => x.managerId === maxBidDetailManagerId);
        if (!s) return null;
        const b = explainAdjustedMaxBid({ residuo: s.residuo, slots: s.slots });
        return (
          <Dialog
            title={`Max bid rettificato · ${s.managerName}`}
            onClose={() => setMaxBidDetailManagerId(null)}
            actions={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMaxBidDetailManagerId(null)}
              >
                Chiudi
              </button>
            }
          >
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {COLUMN_GLOSSARY.adjustedMaxBid.tooltip}
            </p>
            <ul style={{ fontSize: 13, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              <li>Residuo: {b.residuo}</li>
              <li>Slot ancora da riempire: {b.freeSlotsTotal}</li>
              <li>
                Riserva = (slot liberi − 1) × {b.minSlotReserve} = ({b.freeSlotsTotal} − 1) ×{" "}
                {b.minSlotReserve} = {b.reserve}
              </li>
              <li>
                <strong>
                  Max bid rett. = max(0, {b.residuo} − {b.reserve}) = {b.result}
                </strong>
              </li>
            </ul>
          </Dialog>
        );
      })()}
    </>
  );
}
