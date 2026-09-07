import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Player } from "@fanta-helper/shared";
import { SameTeamGoalkeepers } from "./SameTeamGoalkeepers";

function gk(id: number, name: string): Player {
  return {
    id,
    fanta_id: id,
    sofifa_id: null,
    name,
    nome_completo: null,
    team: "Torino",
    ruolo: "P",
    image_url: null,
  };
}

describe("SameTeamGoalkeepers", () => {
  it("rende null con lista vuota", () => {
    const { container } = render(<SameTeamGoalkeepers goalkeepers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("elenca nomi, tier e fair value", () => {
    render(
      <SameTeamGoalkeepers
        goalkeepers={[
          { player: gk(1, "Primo Guanti"), tier: "Top", fairValue: 42 },
          { player: gk(2, "Secondo Guanti"), tier: "Utile", fairValue: 8 },
        ]}
      />,
    );
    expect(screen.getByText("Primo Guanti")).toBeInTheDocument();
    expect(screen.getByText("Secondo Guanti")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/Altri portieri di Torino/)).toBeInTheDocument();
  });
});
