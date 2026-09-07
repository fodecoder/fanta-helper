import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  League,
  Player,
  PurchaseWithDetails,
  ValuationWithPlayer,
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

function mk(id: number, name: string, team: string, ruolo: Player["ruolo"]): Player {
  return { id, fanta_id: id, sofifa_id: null, name, nome_completo: null, team, ruolo, image_url: null };
}

const gk1 = mk(1, "Primo Guanti", "Torino", "P");
const gk2 = mk(2, "Secondo Guanti", "Torino", "P");
const gk3 = mk(3, "Terzo Guanti", "Torino", "P");
const soloGk = mk(4, "Solo Guanti", "Lecce", "P");
const mover = mk(5, "Bomber Granata", "Torino", "A");

function val(player: Player, fairValue: number): ValuationWithPlayer {
  return {
    league_id: 1,
    player_id: player.id,
    name: player.name,
    team: player.team,
    ruolo: player.ruolo,
    image_url: null,
    tier: "Utile",
    target: fairValue,
    fair_value: fairValue,
    max_bid: fairValue + 5,
    panic_price: fairValue + 10,
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
    budget: 500,
    roster_config: defaultRosterConfig,
    budget_target_by_role: defaultBudgetTargetByRole,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

function stubApis(opts: { players: Player[]; purchases?: PurchaseWithDetails[] }) {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue(opts.purchases ?? []);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue([]);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
  vi.mocked(playersApi.listPlayers).mockResolvedValue(opts.players);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([
    val(gk1, 40),
    val(gk2, 12),
    val(gk3, 6),
    val(soloGk, 20),
    val(mover, 80),
  ]);
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

async function call(name: RegExp) {
  const row = await screen.findByRole("button", { name });
  await userEvent.click(row);
}

describe("Vista Asta — portieri stessa squadra", () => {
  it("mostra gli altri portieri della squadra chiamando il portiere titolare", async () => {
    stubApis({ players: [gk1, gk2, gk3, soloGk, mover] });
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await call(/Primo Guanti/);
    const block = await screen.findByTestId("same-team-gk");
    expect(within(block).getByText(/Altri portieri di Torino/)).toBeInTheDocument();
    expect(within(block).getByText("Secondo Guanti")).toBeInTheDocument();
    expect(within(block).getByText("Terzo Guanti")).toBeInTheDocument();
  });

  it("esclude i portieri già acquistati", async () => {
    const purchase = {
      league_id: 1,
      player_id: gk3.id,
      manager_id: 1,
      prezzo: 5,
      player_name: gk3.name,
      player_team: gk3.team,
      player_ruolo: "P",
      player_image_url: null,
      manager_name: "Io",
    } as unknown as PurchaseWithDetails;
    stubApis({ players: [gk1, gk2, gk3, soloGk, mover], purchases: [purchase] });
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await call(/Primo Guanti/);
    const block = await screen.findByTestId("same-team-gk");
    expect(within(block).getByText("Secondo Guanti")).toBeInTheDocument();
    expect(within(block).queryByText("Terzo Guanti")).not.toBeInTheDocument();
  });

  it("nessun blocco se la squadra ha un solo portiere", async () => {
    stubApis({ players: [gk1, gk2, gk3, soloGk, mover] });
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await call(/Solo Guanti/);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("same-team-gk")).not.toBeInTheDocument();
  });

  it("nessun blocco chiamando un giocatore di movimento", async () => {
    stubApis({ players: [gk1, gk2, gk3, soloGk, mover] });
    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    await call(/Bomber Granata/);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("same-team-gk")).not.toBeInTheDocument();
  });
});
