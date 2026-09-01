import { Dialog } from "../../components/ui/Dialog";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import { ROLE_LABEL, roleColor, type OpponentRosterCard } from "../../lib/auctionDerivations";
import type { Role } from "@fanta-helper/shared";

interface OpponentRosterDialogProps {
  cards: OpponentRosterCard[];
  // Ruolo del giocatore in chiamata, per l'etichetta "max su corrente".
  calledRole: Role | null;
  imageUrlFor: (playerId: number) => string | null;
  onClose: () => void;
}

// Dialog "Rose avversari & crediti residui" (handoff § 3): stato completo di
// ogni avversario durante una chiamata live — residuo, max bid sul giocatore
// corrente, uso degli slot per ruolo e rosa acquistata coi prezzi pagati.
// Tutto derivato (vedi opponentRosterCards), nessuno stato memorizzato.
export function OpponentRosterDialog({
  cards,
  calledRole,
  imageUrlFor,
  onClose,
}: OpponentRosterDialogProps) {
  return (
    <Dialog
      title="Rose avversari & crediti residui"
      onClose={onClose}
      wide
      actions={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Chiudi
        </button>
      }
    >
      <div className="opp-grid">
        {cards.map((o) => (
          <div className="opp-card" key={o.managerId}>
            <div className="opp-card__head">
              <span className="opp-card__name">{o.name}</span>
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
                  <div className="opp-roster-row" key={p.player_id}>
                    <PlayerAvatar
                      name={p.name}
                      team=""
                      ruolo={p.ruolo}
                      image_url={imageUrlFor(p.player_id)}
                      size="sm"
                    />
                    <span
                      className="ellipsis"
                      style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600 }}
                    >
                      {p.name}
                    </span>
                    <span className="num" style={{ fontWeight: 700, fontSize: 12 }}>
                      {p.prezzo}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
            Nessun avversario.
          </span>
        )}
      </div>
    </Dialog>
  );
}
