import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  League,
  PlayerRecommendationWithTags,
  WishlistEntryWithPlayer,
} from "@fanta-helper/shared";
import {
  defaultBudgetTargetByRole,
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
} from "@fanta-helper/shared";
import { ValuationsPage } from "./ValuationsPage";
import * as recommendationsApi from "../api/recommendations";
import * as valuationsApi from "../api/valuations";
import * as teamPrefsApi from "../api/teamPrefs";
import * as playerTrapTagsApi from "../api/playerTrapTags";
import * as purchasesApi from "../api/purchases";
import * as wishlistApi from "../api/wishlist";

vi.mock("../api/recommendations");
vi.mock("../api/valuations");
vi.mock("../api/teamPrefs");
vi.mock("../api/playerTrapTags");
vi.mock("../api/purchases");
vi.mock("../api/wishlist");
vi.mock("../components/shell/PageMasthead", () => ({ PageMasthead: () => null }));
vi.mock("../components/TeamPrefPanel", () => ({ TeamPrefPanel: () => null }));
vi.mock("../components/ValuationImportForm", () => ({ ValuationImportForm: () => null }));
vi.mock("../components/ValuationGenerateForm", () => ({ ValuationGenerateForm: () => null }));

function league(): League {
  return {
    id: 7,
    name: "Lega Test",
    n_squadre: 8,
    budget: 500,
    roster_config: defaultRosterConfig,
    budget_target_by_role: defaultBudgetTargetByRole,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

const rec: PlayerRecommendationWithTags = {
  player_id: 42,
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

function wishEntry(): WishlistEntryWithPlayer {
  return {
    league_id: 7,
    player_id: 42,
    priority: 1,
    note: null,
    name: "Test Bomber",
    team: "TeamX",
    ruolo: "A",
    image_url: null,
  };
}

function baseMocks(wishlist: WishlistEntryWithPlayer[]) {
  vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue([rec]);
  vi.mocked(valuationsApi.listValuations).mockResolvedValue([]);
  vi.mocked(teamPrefsApi.listTeamPrefs).mockResolvedValue([]);
  vi.mocked(playerTrapTagsApi.listPlayerTrapTags).mockResolvedValue([]);
  vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
  vi.mocked(wishlistApi.listWishlist).mockResolvedValue(wishlist);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ValuationsPage — stella obiettivo (wishlist)", () => {
  it("clic sulla stella su una riga fuori wishlist chiama addToWishlist", async () => {
    baseMocks([]);
    vi.mocked(wishlistApi.addToWishlist).mockResolvedValue(wishEntry());

    render(<ValuationsPage league={league()} calls={null} />);

    const star = await screen.findByRole("button", { name: "Segna come obiettivo" });
    // il refresh dopo l'aggiunta rilegge la wishlist, ora con il giocatore
    vi.mocked(wishlistApi.listWishlist).mockResolvedValue([wishEntry()]);
    await userEvent.click(star);

    expect(wishlistApi.addToWishlist).toHaveBeenCalledWith(7, 42);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Rimuovi da obiettivi" })).toBeInTheDocument(),
    );
  });

  it("clic sulla stella su una riga già in wishlist chiama removeFromWishlist", async () => {
    baseMocks([wishEntry()]);
    vi.mocked(wishlistApi.removeFromWishlist).mockResolvedValue(undefined);

    render(<ValuationsPage league={league()} calls={null} />);

    const star = await screen.findByRole("button", { name: "Rimuovi da obiettivi" });
    await userEvent.click(star);

    expect(wishlistApi.removeFromWishlist).toHaveBeenCalledWith(7, 42);
  });
});
