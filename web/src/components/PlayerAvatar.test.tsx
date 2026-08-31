import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerAvatar } from "./PlayerAvatar";

describe("PlayerAvatar", () => {
  it("renders the team+role placeholder when image_url is absent", () => {
    render(<PlayerAvatar name="Marco Carnesecchi" team="Atalanta" ruolo="P" />);
    expect(screen.getByText("MC")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("falls back to the placeholder when the image fails to load", () => {
    render(
      <PlayerAvatar
        name="Marco Carnesecchi"
        team="Atalanta"
        ruolo="P"
        image_url="https://broken/img.png"
      />,
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("MC")).toBeInTheDocument();
  });
});
