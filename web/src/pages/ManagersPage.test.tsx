import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { League, Manager } from "@fanta-helper/shared";
import {
  defaultBudgetTargetByRole,
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
} from "@fanta-helper/shared";
import { ManagersPage } from "./ManagersPage";
import * as managersApi from "../api/managers";
import * as purchasesApi from "../api/purchases";

vi.mock("../api/managers");
vi.mock("../api/purchases");
vi.mock("../components/shell/PageMasthead", () => ({ PageMasthead: () => null }));

const managers: Manager[] = [
  { id: 1, name: "Io", league_id: 1, is_owner: true, user_id: null },
  { id: 2, name: "Rivale", league_id: 1, is_owner: false, user_id: null },
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

describe("ManagersPage — focus dal deep-link", () => {
  it("mette a fuoco l'input del manager indicato da focusManagerId dopo il load", async () => {
    vi.mocked(managersApi.listManagers).mockResolvedValue(managers);
    vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(null as never);

    render(<ManagersPage league={league()} calls={null} focusManagerId={2} />);

    const input = (await screen.findByDisplayValue("Rivale")) as HTMLInputElement;
    await waitFor(() => expect(input).toHaveFocus());
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Rivale".length);
  });

  it("senza focusManagerId non mette a fuoco nessun input", async () => {
    vi.mocked(managersApi.listManagers).mockResolvedValue(managers);
    vi.mocked(purchasesApi.getAuctionState).mockResolvedValue(null as never);

    render(<ManagersPage league={league()} calls={null} />);

    await screen.findByDisplayValue("Rivale");
    expect(document.body).toHaveFocus();
  });
});
