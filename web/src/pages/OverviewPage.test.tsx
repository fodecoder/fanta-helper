import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { League, ManagerAuctionStatus } from "@fanta-helper/shared";
import {
  defaultBudgetTargetByRole,
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
} from "@fanta-helper/shared";
import { OverviewPage } from "./OverviewPage";
import * as purchasesApi from "../api/purchases";
import * as valuationsApi from "../api/valuations";
import * as wishlistApi from "../api/wishlist";

vi.mock("../api/purchases");
vi.mock("../api/valuations");
vi.mock("../api/wishlist");
vi.mock("../components/shell/PageMasthead", () => ({ PageMasthead: () => null }));

function slots(): ManagerAuctionStatus["slots"] {
  return [
    { ruolo: "P", total: 3, used: 0, free: 3 },
    { ruolo: "D", total: 8, used: 0, free: 8 },
    { ruolo: "C", total: 8, used: 0, free: 8 },
    { ruolo: "A", total: 6, used: 0, free: 6 },
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
    slots: slots(),
    spentByRole: [],
    adjustedMaxBid: 480,
  },
  {
    managerId: 2,
    managerName: "Rivale",
    isOwner: false,
    budget: 500,
    spent: 200,
    residuo: 300,
    slots: slots(),
    spentByRole: [],
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
    budget_target_by_role: defaultBudgetTargetByRole,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OverviewPage — apertura manager dal nome", () => {
  it("clic sul nome di un manager chiama onOpenManager con il suo id", async () => {
    vi.mocked(purchasesApi.listPurchases).mockResolvedValue([]);
    vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(statuses);
    vi.mocked(valuationsApi.listValuations).mockResolvedValue([]);
    vi.mocked(wishlistApi.listWishlist).mockResolvedValue([]);
    const onOpenManager = vi.fn();

    render(<OverviewPage league={league()} calls={null} onOpenManager={onOpenManager} />);

    await userEvent.click(await screen.findByRole("button", { name: "Rivale" }));

    expect(onOpenManager).toHaveBeenCalledWith(2);
  });
});
