import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

function toggle() {
  return screen.getByRole("button", { name: /Alternative nello stesso ruolo/ });
}

afterEach(() => vi.restoreAllMocks());

describe("AlternativesPanel", () => {
  it("parte collassato: nessun nome visibile finché non si apre", () => {
    const rows = Array.from({ length: 4 }, (_, i) => row(i + 1));
    render(<AlternativesPanel view={makeView(rows)} />);

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Player 1" })).not.toBeInTheDocument();
  });

  it("il click sul titolo apre il pannello e mostra tutti i nomi senza paginazione", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1));
    render(<AlternativesPanel view={makeView(rows)} />);

    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    for (const r of rows) {
      expect(screen.getByRole("button", { name: `Player ${r.player.id}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Successiva" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pagina \d+ di/)).not.toBeInTheDocument();
  });

  it("con 0 alternative mostra il messaggio vuoto", async () => {
    const user = userEvent.setup();
    render(<AlternativesPanel view={makeView([])} />);
    await user.click(toggle());
    expect(screen.getByText("Nessuna alternativa libera in questo ruolo.")).toBeInTheDocument();
  });

  it("il click sul nome apre solo i dettagli, non seleziona il giocatore in asta", async () => {
    const user = userEvent.setup();
    render(<AlternativesPanel view={makeView([row(7)])} />);
    await user.click(toggle());

    const nameBtn = screen.getByRole("button", { name: "Player 7" });
    await user.click(nameBtn);
    expect(nameBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Squadra")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(screen.queryByText("Squadra")).not.toBeInTheDocument();
  });

  it("il select di ordinamento chiama onCompareSortKey", async () => {
    const user = userEvent.setup();
    const onCompareSortKey = vi.fn();
    render(
      <AlternativesPanel view={makeView([row(1), row(2)], { onCompareSortKey })} />,
    );
    await user.click(toggle());
    await user.selectOptions(
      screen.getByLabelText("Ordina alternative per"),
      "target",
    );
    expect(onCompareSortKey).toHaveBeenCalledWith("target");
  });

  it("nessuna immagine giocatore nella griglia", async () => {
    const user = userEvent.setup();
    render(<AlternativesPanel view={makeView([row(1)])} />);
    await user.click(toggle());
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
