import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { League, Player, ValuationWithPlayer } from "@fanta-helper/shared";
import {
  defaultBudgetTargetByRole,
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
} from "@fanta-helper/shared";
import { AuctionMode } from "./AuctionMode";
import * as purchasesApi from "../../api/purchases";
import * as wishlistApi from "../../api/wishlist";
import * as playersApi from "../../api/players";
import * as valuationsApi from "../../api/valuations";
import * as quotationApi from "../../api/quotation";
import * as managersApi from "../../api/managers";
import * as statsEnrichmentApi from "../../api/statsEnrichment";
import * as playerSeasonStatsApi from "../../api/playerSeasonStats";
import * as probableLineupApi from "../../api/probableLineup";
import * as setPieceTakerApi from "../../api/setPieceTaker";
import * as gkPairingApi from "../../api/gkPairing";
import * as recommendationsApi from "../../api/recommendations";

vi.mock("../../api/purchases");
vi.mock("../../api/wishlist");
vi.mock("../../api/players");
vi.mock("../../api/valuations");
vi.mock("../../api/quotation");
vi.mock("../../api/managers");
vi.mock("../../api/statsEnrichment");
vi.mock("../../api/playerSeasonStats");
vi.mock("../../api/probableLineup");
vi.mock("../../api/setPieceTaker");
vi.mock("../../api/gkPairing");
vi.mock("../../api/recommendations");

const striker: Player = {
  id: 1,
  fanta_id: 1,
  sofifa_id: null,
  name: "Test Bomber",
  nome_completo: null,
  team: "TeamX",
  ruolo: "A",
  image_url: null,
};

const NOTE = "Rendimento in calo nel girone di ritorno";

function valuation(note: string | null): ValuationWithPlayer {
  return {
    league_id: 1,
    player_id: 1,
    name: "Test Bomber",
    team: "TeamX",
    ruolo: "A",
    image_url: null,
    tier: "Top",
    target: 50,
    fair_value: 80,
    max_bid: 100,
    panic_price: 120,
    confidence: "medium",
    note,
    override: null,
  };
}

// budget 1000 = base scala valutazioni: nessun riscalaggio, i numeri restano.
function league(): League {
  return {
    id: 1,
    name: "L",
    n_squadre: 8,
    budget: 1000,
    roster_config: defaultRosterConfig,
    budget_target_by_role: defaultBudgetTargetByRole,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

function stubApis(note: string | null) {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue([]);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
  vi.mocked(playersApi.listPlayers).mockResolvedValue([striker]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([valuation(note)]);
  vi.mocked(quotationApi.listCurrentQuotations).mockResolvedValue([]);
  vi.mocked(managersApi.listManagers).mockResolvedValue([]);
  vi.mocked(managersApi.listManagerRosters).mockResolvedValue([]);
  vi.mocked(statsEnrichmentApi.getStatsEnrichment).mockResolvedValue(null as never);
  vi.mocked(playerSeasonStatsApi.getLatestPlayerSeasonStats).mockResolvedValue([]);
  vi.mocked(probableLineupApi.listProbableLineup).mockResolvedValue([]);
  vi.mocked(setPieceTakerApi.listSetPieceTakers).mockResolvedValue([]);
  vi.mocked(gkPairingApi.listGkPairing).mockResolvedValue([]);
  vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue([]);
}

function setViewport(isPhone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isPhone,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => setViewport(false));
afterEach(() => vi.restoreAllMocks());

async function callStriker() {
  await userEvent.click(await screen.findByRole("button", { name: /Test Bomber/ }));
}

async function setPrice(value: string) {
  const input =
    screen.queryByLabelText("Prezzo") ?? screen.getByPlaceholderText("prezzo");
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

describe("Vista Asta — nota di scouting", () => {
  it("nessun blocco quando la valutazione non ha nota", async () => {
    stubApis(null);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    expect(screen.queryByTestId("scouting-note")).not.toBeInTheDocument();
  });

  it("mostra la nota senza evidenza quando il prezzo è entro il max bid", async () => {
    stubApis(NOTE);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    await setPrice("90");
    const note = await screen.findByTestId("scouting-note");
    expect(note).toHaveTextContent(NOTE);
    expect(note).not.toHaveClass("scouting-note--over");
  });

  it("evidenzia la nota quando il prezzo supera il panic price", async () => {
    stubApis(NOTE);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    await setPrice("130");
    const note = await screen.findByTestId("scouting-note");
    expect(note).toHaveClass("scouting-note--over");
  });

  it("mostra la nota anche nella vista telefono", async () => {
    setViewport(true);
    stubApis(NOTE);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    expect(await screen.findByTestId("scouting-note")).toHaveTextContent(NOTE);
  });
});
