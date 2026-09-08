import { Dialog } from "../../components/ui/Dialog";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import { deltaColor, formatDelta } from "../../lib/auctionDerivations";
import type { AuctionView } from "./AuctionMode";

interface PurchaseLogDialogProps {
  rows: AuctionView["logRows"];
  onDeleteCall: AuctionView["onDeleteCall"];
  onUndo: AuctionView["onUndo"];
  onClose: () => void;
}

// Storico acquisti completo, dietro il bottone "Log acquisti" della colonna "Io".
// Le righe e la cancellazione per riga sono le stesse che stavano sempre a schermo
// prima di P30.
export function PurchaseLogDialog({ rows, onDeleteCall, onUndo, onClose }: PurchaseLogDialogProps) {
  return (
    <Dialog
      title="Log acquisti"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Chiudi
        </button>
      }
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onUndo}>
          Annulla ultima
        </button>
      </div>
      <div className="log-scroll" style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((l) => (
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
              style={{ fontSize: 12, color: "var(--color-neutral-700)", whiteSpace: "nowrap" }}
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
              onClick={() => onDeleteCall(l.playerId)}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
