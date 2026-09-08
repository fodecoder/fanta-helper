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

function valuation(): ValuationWithPlayer {
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
    note: null,
    override: null,
  };
}

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

function stubApis() {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue([]);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
  vi.mocked(playersApi.listPlayers).mockResolvedValue([striker]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([valuation()]);
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

describe("Vista Asta desktop — collasso colonna chiamata", () => {
  it("mostra ricerca, filtri e lista giocatori quando espansa", async () => {
    stubApis();
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    expect(await screen.findByPlaceholderText("nome o squadra")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filtro ruolo" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Test Bomber/ })).toBeInTheDocument();
  });

  it("nasconde ricerca, filtri e lista al click sul bottone di collasso", async () => {
    stubApis();
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await screen.findByPlaceholderText("nome o squadra");

    const toggle = screen.getByRole("button", { name: "Comprimi colonna chiamata" });
    await userEvent.click(toggle);

    expect(screen.queryByPlaceholderText("nome o squadra")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtro ruolo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Test Bomber/ })).not.toBeInTheDocument();
  });

  it("riespande la colonna al secondo click sul bottone", async () => {
    stubApis();
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await screen.findByPlaceholderText("nome o squadra");

    await userEvent.click(screen.getByRole("button", { name: "Comprimi colonna chiamata" }));
    await userEvent.click(screen.getByRole("button", { name: "Espandi colonna chiamata" }));

    expect(await screen.findByPlaceholderText("nome o squadra")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Test Bomber/ })).toBeInTheDocument();
  });
});
