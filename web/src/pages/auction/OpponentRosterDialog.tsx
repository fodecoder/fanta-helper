import { Dialog } from "../../components/ui/Dialog";
import { OpponentsBoard } from "./OpponentsBoard";
import type { OpponentRosterCard } from "../../lib/auctionDerivations";
import type { Role } from "@fanta-helper/shared";

interface OpponentRosterDialogProps {
  cards: OpponentRosterCard[];
  // Ruolo del giocatore in chiamata, per l'etichetta "max su corrente".
  calledRole: Role | null;
  imageUrlFor: (playerId: number) => string | null;
  onClose: () => void;
}

// Dialog "Rose avversari & crediti residui": stesso pannello sempre visibile
// sotto il giocatore in chiamata (OpponentsBoard), qui dentro un Dialog come
// fallback finché P30 non lo rimuove.
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
      <OpponentsBoard cards={cards} calledRole={calledRole} imageUrlFor={imageUrlFor} />
    </Dialog>
  );
}
