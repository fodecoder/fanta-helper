import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { League, Player, QuotationRow } from "@fanta-helper/shared";
import { defaultBudgetTargetByRole, defaultModificatori, defaultRosterConfig, defaultScoring } from "@fanta-helper/shared";
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

const RAW_FVM = 33;

const player: Player = {
  id: 1,
  fanta_id: 1,
  sofifa_id: null,
  name: "Test Bomber",
  nome_completo: null,
  team: "TeamX",
  ruolo: "A",
  image_url: null,
};

const quotation: QuotationRow = {
  player_id: 1,
  season: "2024-25",
  qt_i: 10,
  qt_a: 7,
  fvm: RAW_FVM,
};

function league(budget: number): League {
  return {
    id: 1,
    name: "L",
    n_squadre: 8,
    budget,
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
  vi.mocked(playersApi.listPlayers).mockResolvedValue([player]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([]);
  vi.mocked(quotationApi.listCurrentQuotations).mockResolvedValue([quotation]);
  vi.mocked(managersApi.listManagers).mockResolvedValue([]);
  vi.mocked(managersApi.listManagerRosters).mockResolvedValue([]);
  vi.mocked(statsEnrichmentApi.getStatsEnrichment).mockResolvedValue(null as never);
  vi.mocked(playerSeasonStatsApi.getLatestPlayerSeasonStats).mockResolvedValue([]);
  vi.mocked(probableLineupApi.listProbableLineup).mockResolvedValue([]);
  vi.mocked(setPieceTakerApi.listSetPieceTakers).mockResolvedValue([]);
  vi.mocked(gkPairingApi.listGkPairing).mockResolvedValue([]);
  vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue([]);
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function openPanel() {
  const row = await screen.findByRole("button", { name: /Test Bomber/ });
  await userEvent.click(row);
  const label = await screen.findByText("Prezzo medio pagato (proxy FVM)");
  return label.parentElement as HTMLElement;
}

describe("Vista Asta — FVM riscalato al budget di lega", () => {
  it("mostra l'FVM grezzo del listino con budget 500 (base FVM)", async () => {
    stubApis();
    render(<AuctionMode league={league(500)} onExit={vi.fn()} />);
    const panel = await openPanel();
    expect(within(panel).getByText(String(RAW_FVM))).toBeInTheDocument();
  });

  it("raddoppia l'FVM mostrato con budget 1000", async () => {
    stubApis();
    render(<AuctionMode league={league(1000)} onExit={vi.fn()} />);
    const panel = await openPanel();
    expect(within(panel).getByText(String(RAW_FVM * 2))).toBeInTheDocument();
    expect(within(panel).queryByText(String(RAW_FVM))).not.toBeInTheDocument();
  });
});
