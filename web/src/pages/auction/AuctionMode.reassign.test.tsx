import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { League, Manager, ManagerAuctionStatus, ManagerRoster, Player } from "@fanta-helper/shared";
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
  { id: 2, name: "Alfa", league_id: 1, is_owner: false, user_id: null },
  { id: 3, name: "Beta", league_id: 1, is_owner: false, user_id: null },
];

function slots(freeA: number): ManagerAuctionStatus["slots"] {
  return [
    { ruolo: "P", total: 3, used: 0, free: 3 },
    { ruolo: "D", total: 8, used: 0, free: 8 },
    { ruolo: "C", total: 8, used: 0, free: 8 },
    { ruolo: "A", total: 6, used: 6 - freeA, free: freeA },
  ];
}

function statuses(betaFreeA: number): ManagerAuctionStatus[] {
  return [
    {
      managerId: 1,
      managerName: "Io",
      isOwner: true,
      budget: 500,
      spent: 0,
      residuo: 500,
      slots: slots(6),
      spentByRole: [],
      adjustedMaxBid: 480,
    },
    {
      managerId: 2,
      managerName: "Alfa",
      isOwner: false,
      budget: 500,
      spent: 50,
      residuo: 450,
      slots: slots(5),
      spentByRole: [],
      adjustedMaxBid: 400,
    },
    {
      managerId: 3,
      managerName: "Beta",
      isOwner: false,
      budget: 500,
      spent: 0,
      residuo: 500,
      slots: slots(betaFreeA),
      spentByRole: [],
      adjustedMaxBid: 400,
    },
  ];
}

const boughtByAlfa = {
  managerId: 2,
  managerName: "Alfa",
  isOwner: false as const,
  players: [{ player_id: 9, name: "Preso", ruolo: "A" as const, prezzo: 50, tier: "Utile", tags: [] }],
};
const emptyBeta = { managerId: 3, managerName: "Beta", isOwner: false as const, players: [] };

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

function stubApis(betaFreeA: number, rosters: ManagerRoster[]) {
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
  vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(statuses(betaFreeA));
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

function fakeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    setData: (k: string, v: string) => {
      store[k] = v;
    },
    getData: (k: string) => store[k] ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

async function oppCard(name: string): Promise<HTMLElement> {
  await screen.findByRole("button", { name: /Test Bomber/ });
  const card = Array.from(document.querySelectorAll<HTMLElement>(".opp-card")).find(
    (c) => within(c).queryAllByText(name).length > 0,
  );
  if (!card) throw new Error(`card avversario "${name}" non trovata`);
  return card;
}

describe("Vista Asta — riassegnamento e cancellazione dal pannello avversari", () => {
  it("trascina un acquisto da un manager all'altro: delete + insert sul nuovo manager", async () => {
    stubApis(6, [boughtByAlfa, emptyBeta]);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);
    vi.mocked(purchasesApi.createPurchase).mockResolvedValue({} as never);
    // primo load: "Preso" è sotto Alfa; dopo il refresh post-drop passa a Beta
    vi.mocked(managersApi.listManagerRosters).mockReset();
    vi.mocked(managersApi.listManagerRosters)
      .mockResolvedValueOnce([boughtByAlfa, emptyBeta])
      .mockResolvedValue([
        { managerId: 2, managerName: "Alfa", isOwner: false, players: [] },
        {
          managerId: 3,
          managerName: "Beta",
          isOwner: false,
          players: [
            { player_id: 9, name: "Preso", ruolo: "A", prezzo: 50, tier: "Utile", tags: [] },
          ],
        },
      ]);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    const row = within(cardAlfa).getByText("Preso").closest(".opp-roster-row") as HTMLElement;
    const cardBeta = await oppCard("Beta");

    const dt = fakeDataTransfer();
    fireEvent.dragStart(row, { dataTransfer: dt });
    fireEvent.dragOver(cardBeta, { dataTransfer: dt });
    fireEvent.drop(cardBeta, { dataTransfer: dt });

    await waitFor(() => expect(purchasesApi.deletePurchase).toHaveBeenCalledWith(1, 9));
    expect(purchasesApi.createPurchase).toHaveBeenCalledWith(1, {
      player_id: 9,
      manager_id: 3,
      prezzo: 50,
    });

    const betaAfter = await oppCard("Beta");
    expect(within(betaAfter).getByText("Preso")).toBeInTheDocument();
    const alfaAfter = await oppCard("Alfa");
    expect(within(alfaAfter).queryByText("Preso")).not.toBeInTheDocument();
  });

  it("rifiuta il drop su un manager con lo slot del ruolo pieno: messaggio, nessuna chiamata", async () => {
    stubApis(0, [boughtByAlfa, emptyBeta]);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);
    vi.mocked(purchasesApi.createPurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    const row = within(cardAlfa).getByText("Preso").closest(".opp-roster-row") as HTMLElement;
    const cardBeta = await oppCard("Beta");

    const dt = fakeDataTransfer();
    fireEvent.dragStart(row, { dataTransfer: dt });
    fireEvent.drop(cardBeta, { dataTransfer: dt });

    expect(await screen.findByText(/slot di questo ruolo già pieni/)).toBeInTheDocument();
    expect(purchasesApi.deletePurchase).not.toHaveBeenCalled();
    expect(purchasesApi.createPurchase).not.toHaveBeenCalled();
  });

  it("se l'insert sul nuovo manager fallisce, ripristina l'acquisto sull'originale", async () => {
    stubApis(6, [boughtByAlfa, emptyBeta]);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);
    vi.mocked(purchasesApi.createPurchase)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    const row = within(cardAlfa).getByText("Preso").closest(".opp-roster-row") as HTMLElement;
    const cardBeta = await oppCard("Beta");

    const dt = fakeDataTransfer();
    fireEvent.dragStart(row, { dataTransfer: dt });
    fireEvent.drop(cardBeta, { dataTransfer: dt });

    await waitFor(() =>
      expect(purchasesApi.createPurchase).toHaveBeenLastCalledWith(1, {
        player_id: 9,
        manager_id: 2,
        prezzo: 50,
      }),
    );
    expect(await screen.findByText(/ripristinato sul manager originale/)).toBeInTheDocument();
  });

  it("il bottone cestino su una riga rosa cancella l'acquisto", async () => {
    stubApis(6, [boughtByAlfa, emptyBeta]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    await userEvent.click(
      within(cardAlfa).getByRole("button", { name: /Annulla l'acquisto di Preso/ }),
    );
    await waitFor(() => expect(purchasesApi.deletePurchase).toHaveBeenCalledWith(1, 9));
  });

  it("modifica i crediti di un acquisto: delete + insert con lo stesso manager", async () => {
    stubApis(6, [boughtByAlfa, emptyBeta]);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);
    vi.mocked(purchasesApi.createPurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    const user = userEvent.setup();
    await user.click(within(cardAlfa).getByRole("button", { name: "50" }));
    const input = within(cardAlfa).getByLabelText("Modifica crediti di Preso");
    await user.clear(input);
    await user.type(input, "70{Enter}");

    await waitFor(() => expect(purchasesApi.deletePurchase).toHaveBeenCalledWith(1, 9));
    expect(purchasesApi.createPurchase).toHaveBeenCalledWith(1, {
      player_id: 9,
      manager_id: 2,
      prezzo: 70,
    });
  });

  it("rifiuta una modifica che porterebbe il residuo sotto zero: nessuna chiamata", async () => {
    stubApis(6, [boughtByAlfa, emptyBeta]);
    vi.mocked(purchasesApi.deletePurchase).mockResolvedValue({} as never);
    vi.mocked(purchasesApi.createPurchase).mockResolvedValue({} as never);

    render(<AuctionMode league={league()} onExit={vi.fn()} />);
    const cardAlfa = await oppCard("Alfa");
    const user = userEvent.setup();
    await user.click(within(cardAlfa).getByRole("button", { name: "50" }));
    const input = within(cardAlfa).getByLabelText("Modifica crediti di Preso");
    await user.clear(input);
    // Alfa ha residuo 450 e ha già speso 50 su "Preso": budget disponibile
    // massimo per lui è 450 + 50 = 500.
    await user.type(input, "600{Enter}");

    expect(await screen.findByText(/supererebbe il residuo disponibile/)).toBeInTheDocument();
    expect(purchasesApi.deletePurchase).not.toHaveBeenCalled();
    expect(purchasesApi.createPurchase).not.toHaveBeenCalled();
  });
});
