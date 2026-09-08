import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OpponentRosterCard } from "../../lib/auctionDerivations";
import { OpponentsBoard } from "./OpponentsBoard";

function card(over: Partial<OpponentRosterCard> = {}): OpponentRosterCard {
  return {
    managerId: 2,
    name: "Rivale",
    residuo: 100,
    maxOnCurrent: 50,
    slots: [],
    roster: [{ player_id: 9, name: "Big A", ruolo: "A", prezzo: 30 }],
    ...over,
  };
}

describe("OpponentsBoard", () => {
  it("non mostra immagini nelle righe rosa", () => {
    render(<OpponentsBoard cards={[card()]} calledRole={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("senza onDeletePurchase non mostra il bottone di cancellazione", () => {
    render(<OpponentsBoard cards={[card()]} calledRole={null} />);
    expect(screen.queryByTitle("Annulla questo acquisto")).not.toBeInTheDocument();
  });

  it("con onDeletePurchase mostra e aziona il bottone di cancellazione", async () => {
    const user = userEvent.setup();
    const onDeletePurchase = vi.fn();
    render(<OpponentsBoard cards={[card()]} calledRole={null} onDeletePurchase={onDeletePurchase} />);
    await user.click(screen.getByLabelText("Annulla l'acquisto di Big A"));
    expect(onDeletePurchase).toHaveBeenCalledWith(9);
  });

  it("senza onUpdatePurchasePrice i crediti non sono modificabili", () => {
    render(<OpponentsBoard cards={[card()]} calledRole={null} />);
    expect(screen.getByRole("button", { name: "30" })).toBeDisabled();
  });

  it("con onUpdatePurchasePrice il click sui crediti apre un campo e Invio conferma", async () => {
    const user = userEvent.setup();
    const onUpdatePurchasePrice = vi.fn();
    render(
      <OpponentsBoard
        cards={[card()]}
        calledRole={null}
        onUpdatePurchasePrice={onUpdatePurchasePrice}
      />,
    );
    await user.click(screen.getByRole("button", { name: "30" }));
    const input = screen.getByLabelText("Modifica crediti di Big A");
    await user.clear(input);
    await user.type(input, "45{Enter}");
    expect(onUpdatePurchasePrice).toHaveBeenCalledWith(9, 2, 30, 45);
  });
});

// L'ordinamento per ruolo (P-D-C-A) poi data di acquisto è responsabilità di
// `opponentRosterCards` (vedi auctionDerivations.test.ts): questo componente
// renderizza `card.roster` nell'ordine ricevuto.
