import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WarningBadge } from "./WarningBadge";

describe("WarningBadge", () => {
  it("senza avvisi non renderizza nulla", () => {
    const { container } = render(<WarningBadge warnings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con avvisi mostra l'emoji ma non il toast finché non è aperto", () => {
    render(<WarningBadge warnings={["Motivo 1"]} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.queryByText("Motivo 1")).not.toBeInTheDocument();
  });

  it("il click apre il toast con tutti i motivi", async () => {
    const user = userEvent.setup();
    render(<WarningBadge warnings={["Motivo 1", "Motivo 2"]} />);
    await user.click(screen.getByRole("button", { name: /Avviso:/ }));
    expect(screen.getByText("Motivo 1")).toBeInTheDocument();
    expect(screen.getByText("Motivo 2")).toBeInTheDocument();
  });

  it("il mouseover apre il toast, il mouseleave lo chiude", async () => {
    const user = userEvent.setup();
    render(<WarningBadge warnings={["Motivo 1"]} />);
    await user.hover(screen.getByRole("button", { name: /Avviso:/ }));
    expect(screen.getByText("Motivo 1")).toBeInTheDocument();
    await user.unhover(screen.getByRole("button", { name: /Avviso:/ }));
    expect(screen.queryByText("Motivo 1")).not.toBeInTheDocument();
  });
});
