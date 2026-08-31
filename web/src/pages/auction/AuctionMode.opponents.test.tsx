import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  League,
  Manager,
  ManagerAuctionStatus,
  ManagerRoster,
  Player,
} from "@fanta-helper/shared";
import { defaultModificatori, defaultRosterConfig, defaultScoring } from "@fanta-helper/shared";
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

function slots(free: number): ManagerAuctionStatus["slots"] {
  return [
    { ruolo: "P", total: 3, used: 0, free: 3 },
    { ruolo: "D", total: 8, used: 0, free: 8 },
    { ruolo: "C", total: 8, used: 0, free: 8 },
    { ruolo: "A", total: 6, used: 6 - free, free },
  ];
}

const statuses: ManagerAuctionStatus[] = [
  {
    managerId: 1,
    managerName: "Io",
    isOwner: true,
    budget: 500,
    spent: 0,
    residuo: 500,
    slots: slots(6),
    adjustedMaxBid: 480,
  },
  {
    managerId: 2,
    managerName: "Rivale",
    isOwner: false,
    budget: 500,
    spent: 200,
    residuo: 300,
    slots: slots(4),
    adjustedMaxBid: 280,
  },
];

function league(): League {
  return {
    id: 1,
    name: "L",
    n_squadre: 8,
    budget: 500,
    roster_config: defaultRosterConfig,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

function stubApis(rosters: ManagerRoster[]) {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(statuses);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
  vi.mocked(playersApi.listPlayers).mockResolvedValue([striker]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([]);
  vi.mocked(quotationApi.listCurrentQuotations).mockResolvedValue([]);
  vi.mocked(managersApi.listManagers).mockResolvedValue(managers);
  vi.mocked(managersApi.listManagerRosters).mockResolvedValue(rosters);
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

async function callStriker() {
  const row = await screen.findByRole("button", { name: /Test Bomber/ });
  await userEvent.click(row);
}

describe("Vista Asta — pannello avversari contestuale", () => {
  it("mostra residuo e max spendibile dell'avversario sul giocatore in chiamata", async () => {
    stubApis([{ managerId: 2, managerName: "Rivale", isOwner: false, players: [] }]);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    expect(await screen.findByText("res 300")).toBeInTheDocument();
    expect(screen.getByText("max 280")).toBeInTheDocument();
  });

  it("segnala quando un avversario ha già preso giocatori forti nel ruolo", async () => {
    stubApis([
      {
        managerId: 2,
        managerName: "Rivale",
        isOwner: false,
        players: [
          { player_id: 9, name: "Big A", ruolo: "A", prezzo: 120, tier: "Top", tags: [] },
          { player_id: 8, name: "Mid A", ruolo: "A", prezzo: 30, tier: "Utile", tags: [] },
        ],
      },
    ]);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    expect(await screen.findByText(/Rivale: già 1 Attaccante forti \(2 in reparto\)/)).toBeInTheDocument();
  });

  it("nessun avviso quando l'avversario non ha acquisti", async () => {
    stubApis([{ managerId: 2, managerName: "Rivale", isOwner: false, players: [] }]);
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await callStriker();
    expect(screen.queryByText(/forti \(/)).not.toBeInTheDocument();
  });
});
