import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerAvatar } from "./PlayerAvatar";

describe("PlayerAvatar", () => {
  it("renders the team+role placeholder with initials when image_url is absent", () => {
    render(<PlayerAvatar name="Marco Carnesecchi" team="Atalanta" ruolo="P" />);
    expect(screen.getByText("MC")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders a background-image photo box when image_url is present (no <img>)", () => {
    render(
      <PlayerAvatar
        name="Marco Carnesecchi"
        team="Atalanta"
        ruolo="P"
        image_url="https://example.test/img.png"
      />,
    );
    // Slot foto = <span role="img"> con background-image, mai <img> (niente
    // icona di immagine rotta se l'URL fallisce).
    const box = screen.getByRole("img", { name: "Marco Carnesecchi" });
    expect(box.tagName).toBe("SPAN");
    expect(box).toHaveStyle({ backgroundImage: 'url("https://example.test/img.png")' });
    expect(screen.queryByText("MC")).not.toBeInTheDocument();
  });
});
