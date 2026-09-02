import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerRecommendationWithTags, ValuationWithPlayer } from "@fanta-helper/shared";
import { MergedValuationRow } from "./MergedValuationRow";
import * as valuationsApi from "../api/valuations";

vi.mock("../api/valuations");

const rec: PlayerRecommendationWithTags = {
  player_id: 1,
  ruolo: "A",
  name: "Test Bomber",
  nome_completo: null,
  team: "TeamX",
  image_url: null,
  score: 10,
  tier: "Top",
  components: {
    reliability: 0.8,
    leagueAdjustedFm: 7,
    fmScorsaStagione: 7,
    rawValue: 10,
    scarcityMultiplier: 1,
    replacementValue: 0,
    ioNeedsRole: true,
    dataMissing: false,
    breakdown: null,
  },
  price: {
    qt_i: 10,
    qt_a: 7,
    fvm: 33,
    valuePercentile: null,
    pricePercentile: null,
    gapSignal: null,
  },
  tags: [],
};

function valuation(maxBidBase: number): ValuationWithPlayer {
  return {
    league_id: 1,
    player_id: 1,
    name: "Test Bomber",
    team: "TeamX",
    ruolo: "A",
    image_url: null,
    tier: "Top",
    target: 100,
    fair_value: 120,
    max_bid: maxBidBase,
    panic_price: 80,
    confidence: "medium",
    note: null,
    override: null,
  };
}

function renderRow(props: { factor: number; leagueBudget: number; maxBidBase: number }) {
  return render(
    <table>
      <tbody>
        <MergedValuationRow
          leagueId={1}
          rec={rec}
          valuation={valuation(props.maxBidBase)}
          factor={props.factor}
          leagueBudget={props.leagueBudget}
          normalizedScore={5}
          purchased={false}
          isTrap={false}
          onToggleTrap={vi.fn()}
          onDetails={vi.fn()}
          onSaved={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

function pctInput(): HTMLElement {
  const inputs = screen.getAllByRole("textbox");
  const pct = inputs.find((el) => (el as HTMLInputElement).style.width === "44px");
  if (!pct) throw new Error("percent input not found");
  return pct;
}

describe("MergedValuationRow — max bid come percentuale del budget", () => {
  it("converte 40% del budget 500 in crediti sulla base 1000", async () => {
    vi.mocked(valuationsApi.upsertValuationOverride).mockResolvedValue(undefined);
    renderRow({ factor: 0.5, leagueBudget: 500, maxBidBase: 30 });
    const input = pctInput();
    await userEvent.clear(input);
    await userEvent.type(input, "40");
    await userEvent.tab();
    expect(valuationsApi.upsertValuationOverride).toHaveBeenCalledWith(1, 1, { max_bid: 400 });
  });

  it("converte 25% del budget 1000 con factor 1", async () => {
    vi.mocked(valuationsApi.upsertValuationOverride).mockResolvedValue(undefined);
    renderRow({ factor: 1, leagueBudget: 1000, maxBidBase: 30 });
    const input = pctInput();
    await userEvent.clear(input);
    await userEvent.type(input, "25");
    await userEvent.tab();
    expect(valuationsApi.upsertValuationOverride).toHaveBeenCalledWith(1, 1, { max_bid: 250 });
  });

  it("rifiuta una percentuale fuori range e mostra un errore", async () => {
    vi.mocked(valuationsApi.upsertValuationOverride).mockResolvedValue(undefined);
    renderRow({ factor: 1, leagueBudget: 1000, maxBidBase: 30 });
    const input = pctInput();
    await userEvent.clear(input);
    await userEvent.type(input, "150");
    await userEvent.tab();
    expect(valuationsApi.upsertValuationOverride).not.toHaveBeenCalled();
    expect(screen.getByText("percentuale non valida")).toBeInTheDocument();
  });
});
