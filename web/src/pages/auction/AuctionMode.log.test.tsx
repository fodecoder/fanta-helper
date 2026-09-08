import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  League,
  Manager,
  ManagerAuctionStatus,
  Player,
  PurchaseWithDetails,
} from "@fanta-helper/shared";
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

const managers: Manager[] = [
  { id: 1, name: "Io", league_id: 1, is_owner: true, user_id: null },
  { id: 2, name: "Rivale", league_id: 1, is_owner: false, user_id: null },
];

const statuses: ManagerAuctionStatus[] = [
  {
    managerId: 1,
    managerName: "Io",
    isOwner: true,
    budget: 500,
    spent: 0,
    residuo: 500,
    slots: [
      { ruolo: "P", total: 3, used: 0, free: 3 },
      { ruolo: "D", total: 8, used: 0, free: 8 },
      { ruolo: "C", total: 8, used: 0, free: 8 },
      { ruolo: "A", total: 6, used: 0, free: 6 },
    ],
    spentByRole: [],
    adjustedMaxBid: 480,
  },
];

const purchase: PurchaseWithDetails = {
  league_id: 1,
  player_id: 9,
  manager_id: 2,
  prezzo: 42,
  ts: "2026-09-08T10:00:00.000Z",
  player_name: "Preso Forte",
  player_team: "TeamY",
  player_ruolo: "A",
  player_image_url: null,
  manager_name: "Rivale",
};

function league(): League {
  return {
    id: 1,
    name: "L",
    n_squadre: 8,
    budget: 500,
    roster_config: defaultRosterConfig,
    budget_target_by_role: defaultBudgetTargetByRole,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

function stubApis() {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([purchase]);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(statuses);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
  vi.mocked(playersApi.listPlayers).mockResolvedValue([striker]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([]);
  vi.mocked(quotationApi.listCurrentQuotations).mockResolvedValue([]);
  vi.mocked(managersApi.listManagers).mockResolvedValue(managers);
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

describe("Vista Asta — log acquisti dietro un bottone", () => {
  it("lo storico non è a schermo: compare solo dopo il click su 'Log acquisti'", async () => {
    stubApis();
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const openBtn = await screen.findByRole("button", { name: "Log acquisti" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Preso Forte")).not.toBeInTheDocument();

    await userEvent.click(openBtn);
    const dialog = await screen.findByRole("dialog", { name: "Log acquisti" });
    expect(within(dialog).getByText("Preso Forte")).toBeInTheDocument();
    expect(within(dialog).getByText("Rivale")).toBeInTheDocument();
    expect(within(dialog).getByText("42")).toBeInTheDocument();
  });

  it("il cestino di una riga dentro il dialog cancella l'acquisto", async () => {
    stubApis();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Log acquisti" }));
    const dialog = await screen.findByRole("dialog", { name: "Log acquisti" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Annulla la chiamata di Preso Forte/ }),
    );
    await waitFor(() => expect(purchasesApi.deletePurchase).toHaveBeenCalledWith(1, 9));
  });

  it("'Annulla ultima' fuori dal dialog rimuove l'ultimo acquisto", async () => {
    stubApis();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(purchasesApi.deleteLastPurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Annulla ultima" }));
    await waitFor(() => expect(purchasesApi.deleteLastPurchase).toHaveBeenCalledWith(1));
  });

  it("Escape chiude il dialog", async () => {
    stubApis();
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Log acquisti" }));
    expect(await screen.findByRole("dialog", { name: "Log acquisti" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
