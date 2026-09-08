import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Player, ValuationWithPlayer } from "@fanta-helper/shared";
import type { CompareRow } from "../lib/auctionDerivations";
import { AlternativesPanel, type AlternativesPanelView } from "./AlternativesPanel";

function player(id: number, name: string): Player {
  return {
    id,
    fanta_id: id,
    sofifa_id: null,
    name,
    nome_completo: null,
    team: "TeamX",
    ruolo: "A",
    image_url: null,
  };
}

function valuation(id: number): ValuationWithPlayer {
  return {
    league_id: 1,
    player_id: id,
    name: `P${id}`,
    team: "TeamX",
    ruolo: "A",
    image_url: null,
    tier: "Top",
    target: 40,
    fair_value: 60,
    max_bid: 80,
    panic_price: 100,
    confidence: "medium",
    note: null,
    override: null,
  };
}

function row(id: number): CompareRow {
  return {
    player: player(id, `Player ${id}`),
    valuation: valuation(id),
    delta: 0,
    isCurrent: false,
    quotation: undefined,
    seasonStats: undefined,
    score: null,
    displayScore: null,
    tags: [],
    teamPref: null,
  };
}

function makeView(rows: CompareRow[], over: Partial<AlternativesPanelView> = {}): AlternativesPanelView {
  return {
    compareRows: rows,
    compareMaxFv: 100,
    compareSortKey: "fair_value",
    onCompareSortKey: vi.fn(),
    compareSortValueFor: () => null,
    onSelect: vi.fn(),
    quotationFor: () => undefined,
    weightedFvmFor: () => null,
    seasonStatsById: new Map(),
    attributesFor: () => undefined,
    probableLineup: null,
    setPieceTakers: null,
    recommendationFor: () => undefined,
    normalizedScoreFor: () => null,
    ...over,
  };
}

function rowNames(): string[] {
  return screen
    .getAllByRole("button", { name: /^Player \d+$/ })
    .map((b) => b.textContent ?? "");
}

afterEach(() => vi.restoreAllMocks());

describe("AlternativesPanel", () => {
  it("mostra 5 righe per pagina e pagina avanti/indietro", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1));
    render(<AlternativesPanel view={makeView(rows)} />);

    expect(rowNames()).toEqual(["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]);
    expect(screen.getByText("Pagina 1 di 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Successiva" }));
    expect(rowNames()).toEqual(["Player 6", "Player 7", "Player 8", "Player 9", "Player 10"]);
    expect(screen.getByText("Pagina 2 di 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Precedente" }));
    expect(rowNames()).toEqual(["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]);
  });

  it("disabilita Precedente sulla prima pagina e Successiva sull'ultima", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1));
    render(<AlternativesPanel view={makeView(rows)} />);

    expect(screen.getByRole("button", { name: "Precedente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Successiva" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Successiva" }));
    await user.click(screen.getByRole("button", { name: "Successiva" }));
    expect(screen.getByText("Pagina 3 di 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Successiva" })).toBeDisabled();
  });

  it("non mostra i controlli di paginazione con 5 righe o meno", () => {
    render(<AlternativesPanel view={makeView([row(1), row(2), row(3)])} />);
    expect(screen.queryByRole("button", { name: "Successiva" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pagina \d+ di/)).not.toBeInTheDocument();
  });

  it("rimonta con key nuova (cambio giocatore) e torna a pagina 1", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1));
    const { rerender } = render(
      <AlternativesPanel key="1:fair_value" view={makeView(rows)} />,
    );
    await user.click(screen.getByRole("button", { name: "Successiva" }));
    expect(screen.getByText("Pagina 2 di 3")).toBeInTheDocument();

    rerender(<AlternativesPanel key="2:fair_value" view={makeView(rows)} />);
    expect(screen.getByText("Pagina 1 di 3")).toBeInTheDocument();
  });

  it("il select di ordinamento chiama onCompareSortKey", async () => {
    const user = userEvent.setup();
    const onCompareSortKey = vi.fn();
    render(
      <AlternativesPanel view={makeView([row(1), row(2)], { onCompareSortKey })} />,
    );
    await user.selectOptions(
      screen.getByLabelText("Ordina alternative per"),
      "target",
    );
    expect(onCompareSortKey).toHaveBeenCalledWith("target");
  });

  it("con 0 alternative mostra il messaggio vuoto e nessuna barra", () => {
    const { container } = render(<AlternativesPanel view={makeView([])} />);
    expect(screen.getByText("Nessuna alternativa libera in questo ruolo.")).toBeInTheDocument();
    expect(container.querySelector(".bar-track")).toBeNull();
    expect(screen.queryByRole("button", { name: "Successiva" })).not.toBeInTheDocument();
  });

  it("il toggle Dettagli apre un solo pannello per volta", async () => {
    const user = userEvent.setup();
    render(<AlternativesPanel view={makeView([row(1), row(2)])} />);

    const [first, second] = screen.getAllByRole("listitem") as [HTMLElement, HTMLElement];
    await user.click(within(first).getByRole("button", { name: "Dettagli" }));
    expect(within(first).getByText("Squadra")).toBeInTheDocument();

    await user.click(within(second).getByRole("button", { name: "Dettagli" }));
    expect(within(second).getByText("Squadra")).toBeInTheDocument();
    expect(within(first).queryByText("Squadra")).not.toBeInTheDocument();

    await user.click(within(second).getByRole("button", { name: "Chiudi" }));
    expect(within(second).queryByText("Squadra")).not.toBeInTheDocument();
  });

  it("il click sul nome seleziona il giocatore", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AlternativesPanel view={makeView([row(7)], { onSelect })} />);
    await user.click(screen.getByRole("button", { name: "Player 7" }));
    expect(onSelect).toHaveBeenCalledWith(7);
  });
});
