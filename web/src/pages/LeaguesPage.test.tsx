import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { League } from "@fanta-helper/shared";
import { defaultBudgetTargetByRole, defaultModificatori, defaultRosterConfig, defaultScoring } from "@fanta-helper/shared";
import { LeaguesPage } from "./LeaguesPage";
import * as leaguesApi from "../api/leagues";

vi.mock("../api/leagues");
vi.mock("../components/LeagueForm", () => ({ LeagueForm: () => <div data-testid="league-form" /> }));
vi.mock("../components/shell/PageMasthead", () => ({ PageMasthead: () => null }));

function league(id: number, name: string): League {
  return {
    id,
    name,
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

describe("LeaguesPage — delete action", () => {
  it("deletes a league on confirm and clears the active selection when it was active", async () => {
    vi.mocked(leaguesApi.listLeagues).mockResolvedValue([league(1, "Alpha"), league(2, "Beta")]);
    vi.mocked(leaguesApi.deleteLeague).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onLeaguesChanged = vi.fn();
    const onSelectLeague = vi.fn();

    render(
      <LeaguesPage
        calls={null}
        activeLeagueId={1}
        onLeaguesChanged={onLeaguesChanged}
        onSelectLeague={onSelectLeague}
      />,
    );

    await screen.findByText("Alpha");
    const alphaRow = screen.getByText("Alpha").closest("tr") as HTMLElement;
    await userEvent.click(within(alphaRow).getByRole("button", { name: "Elimina" }));

    expect(leaguesApi.deleteLeague).toHaveBeenCalledWith(1);
    await waitFor(() => expect(onSelectLeague).toHaveBeenCalledWith(null));
    expect(onLeaguesChanged).toHaveBeenCalled();
  });

  it("does nothing when the confirm dialog is dismissed", async () => {
    vi.mocked(leaguesApi.listLeagues).mockResolvedValue([league(1, "Alpha")]);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <LeaguesPage calls={null} activeLeagueId={null} onLeaguesChanged={vi.fn()} onSelectLeague={vi.fn()} />,
    );

    await screen.findByText("Alpha");
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

    expect(leaguesApi.deleteLeague).not.toHaveBeenCalled();
  });
});
