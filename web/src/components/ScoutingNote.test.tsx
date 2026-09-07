import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoutingNote } from "./ScoutingNote";

describe("ScoutingNote", () => {
  it("rende null con nota vuota", () => {
    const { container } = render(<ScoutingNote note="   " highlighted={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra la nota senza classe di evidenza quando non evidenziata", () => {
    render(<ScoutingNote note="Occhio al rinnovo di contratto" highlighted={false} />);
    const el = screen.getByTestId("scouting-note");
    expect(el).toHaveTextContent("Occhio al rinnovo di contratto");
    expect(el).not.toHaveClass("scouting-note--over");
  });

  it("applica la classe di evidenza quando evidenziata", () => {
    render(<ScoutingNote note="Prezzo gonfiato dalle aste" highlighted />);
    expect(screen.getByTestId("scouting-note")).toHaveClass("scouting-note--over");
  });
});
