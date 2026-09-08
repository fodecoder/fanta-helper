import { useState, type DragEvent } from "react";
import { WarningBadge } from "../../components/WarningBadge";
import { ROLE_LABEL, roleColor, type OpponentRosterCard } from "../../lib/auctionDerivations";
import type { Role } from "@fanta-helper/shared";

interface OpponentsBoardProps {
  cards: OpponentRosterCard[];
  // Ruolo del giocatore in chiamata, per l'etichetta "max <ruolo>".
  calledRole: Role | null;
  // Avvisi per manager (P30): badge lampeggiante accanto al nome. Opzionale:
  // senza, nessun badge (es. dialog di fallback senza dati sufficienti).
  warningsFor?: (managerId: number) => string[];
  // P29 — azioni sulle righe rosa. Opzionali: senza `onReassignPurchase` le righe
  // non sono trascinabili (telefono / dialog di fallback), senza `onDeletePurchase`
  // sparisce il bottone di cancellazione.
  onDeletePurchase?: (playerId: number) => void;
  onReassignPurchase?: (
    playerId: number,
    prezzo: number,
    ruolo: Role,
    fromManagerId: number,
    toManagerId: number,
  ) => void;
  // Modifica del prezzo di un acquisto (click sui crediti). Opzionale come le
  // altre azioni: senza, i crediti restano testo non cliccabile.
  onUpdatePurchasePrice?: (playerId: number, managerId: number, oldPrezzo: number, newPrezzo: number) => void;
  reassignError?: string | null;
}

const DRAG_MIME = "application/x-fanta-purchase";

interface DragPayload {
  playerId: number;
  prezzo: number;
  ruolo: Role;
  fromManagerId: number;
}

// Stato completo di ogni avversario durante l'asta — residuo, max bid sul
// giocatore in chiamata, uso degli slot per ruolo e rosa acquistata coi prezzi
// pagati. Tutto derivato da opponentRosterCards, nessuno stato memorizzato.
// Reso inline sotto il giocatore in chiamata (desktop e telefono).
export function OpponentsBoard({
  cards,
  calledRole,
  onDeletePurchase,
  onReassignPurchase,
  onUpdatePurchasePrice,
  warningsFor,
  reassignError,
}: OpponentsBoardProps) {
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [dragOverManager, setDragOverManager] = useState<number | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const draggable = !!onReassignPurchase;

  function startEdit(playerId: number, prezzo: number) {
    if (!onUpdatePurchasePrice) return;
    setEditingPlayerId(playerId);
    setEditingValue(String(prezzo));
  }

  function commitEdit(managerId: number, playerId: number, oldPrezzo: number) {
    if (!onUpdatePurchasePrice) return;
    const parsed = Number(editingValue);
    setEditingPlayerId(null);
    if (!Number.isFinite(parsed) || parsed < 0 || Math.trunc(parsed) !== parsed) return;
    if (parsed === oldPrezzo) return;
    onUpdatePurchasePrice(playerId, managerId, oldPrezzo, parsed);
  }

  function onDragStart(e: DragEvent, payload: DragPayload) {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDraggingFrom(payload.fromManagerId);
  }

  function onDrop(e: DragEvent, toManagerId: number) {
    e.preventDefault();
    setDraggingFrom(null);
    setDragOverManager(null);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw || !onReassignPurchase) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    onReassignPurchase(
      payload.playerId,
      payload.prezzo,
      payload.ruolo,
      payload.fromManagerId,
      toManagerId,
    );
  }

  return (
    <div className="opp-grid">
      {reassignError && <div className="opp-reassign-error">{reassignError}</div>}
      {cards.map((o) => {
        const isDropTarget = draggingFrom !== null && draggingFrom !== o.managerId;
        return (
          <div
            className={`opp-card${
              isDropTarget && dragOverManager === o.managerId ? " opp-card--dragover" : ""
            }`}
            key={o.managerId}
            onDragOver={
              isDropTarget
                ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverManager(o.managerId);
                  }
                : undefined
            }
            onDragLeave={
              isDropTarget
                ? () => setDragOverManager((m) => (m === o.managerId ? null : m))
                : undefined
            }
            onDrop={draggable ? (e) => onDrop(e, o.managerId) : undefined}
          >
            <div className="opp-card__head">
              <span className="opp-card__name">
                {o.name}
                {warningsFor && <WarningBadge warnings={warningsFor(o.managerId)} />}
              </span>
              <span className="num" style={{ fontSize: 11, color: "var(--color-neutral-700)" }}>
                {calledRole ? `max ${ROLE_LABEL[calledRole].toLowerCase()}` : "max su corrente"}
              </span>
            </div>

            <div className="opp-card__stats">
              <div className="opp-card__stat">
                <div className="n" style={{ color: "var(--color-accent)" }}>
                  {o.residuo}
                </div>
                <div className="l">residuo</div>
              </div>
              <div className="opp-card__stat">
                <div className="n">{o.maxOnCurrent}</div>
                <div className="l">max bid</div>
              </div>
            </div>

            <div className="opp-card__slots">
              {o.slots.map((s) => (
                <span className="opp-card__slot" key={s.ruolo}>
                  <span className="r" style={{ color: roleColor(s.ruolo) }}>
                    {s.ruolo}
                  </span>
                  <span className="v">
                    {s.used}/{s.total}
                  </span>
                </span>
              ))}
            </div>

            <div className="opp-roster-scroll">
              {o.roster.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                  Nessun acquisto ancora.
                </span>
              ) : (
                o.roster.map((p) => (
                  <div
                    className={`opp-roster-row${
                      draggingFrom === o.managerId ? " opp-roster-row--dragging" : ""
                    }`}
                    key={p.player_id}
                    draggable={draggable}
                    onDragStart={
                      draggable
                        ? (e) =>
                            onDragStart(e, {
                              playerId: p.player_id,
                              prezzo: p.prezzo,
                              ruolo: p.ruolo,
                              fromManagerId: o.managerId,
                            })
                        : undefined
                    }
                    onDragEnd={
                      draggable
                        ? () => {
                            setDraggingFrom(null);
                            setDragOverManager(null);
                          }
                        : undefined
                    }
                  >
                    <span
                      className="role-tag"
                      style={{ width: 14, fontSize: 11, color: roleColor(p.ruolo) }}
                    >
                      {p.ruolo}
                    </span>
                    <span
                      className="ellipsis"
                      style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600 }}
                    >
                      {p.name}
                    </span>
                    {editingPlayerId === p.player_id ? (
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        step={1}
                        className="input num"
                        aria-label={`Modifica crediti di ${p.name}`}
                        style={{ width: 52, fontSize: 12, padding: "1px 4px" }}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEdit(o.managerId, p.player_id, p.prezzo)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setEditingPlayerId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="num"
                        title={onUpdatePurchasePrice ? "Modifica crediti" : undefined}
                        disabled={!onUpdatePurchasePrice}
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          cursor: onUpdatePurchasePrice ? "pointer" : "default",
                          color: "inherit",
                        }}
                        onClick={() => startEdit(p.player_id, p.prezzo)}
                      >
                        {p.prezzo}
                      </button>
                    )}
                    {onDeletePurchase && (
                      <button
                        type="button"
                        className="opp-roster-del"
                        title="Annulla questo acquisto"
                        aria-label={`Annulla l'acquisto di ${p.name}`}
                        onClick={() => onDeletePurchase(p.player_id)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
      {cards.length === 0 && (
        <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>Nessun avversario.</span>
      )}
    </div>
  );
}
