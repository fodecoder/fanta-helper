import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MOBILE_BREAKPOINT_PX, MOBILE_QUERY, useMediaQuery } from "./useMediaQuery";

type Listener = () => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initialMatches,
    media: MOBILE_QUERY,
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    setMatches(value: boolean) {
      mql.matches = value;
      act(() => listeners.forEach((cb) => cb()));
    },
    listenerCount: () => listeners.size,
  };
}

function Probe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <span>{matches ? "match" : "no-match"}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMediaQuery", () => {
  it("exposes the mobile breakpoint constant used in index.css", () => {
    expect(MOBILE_BREAKPOINT_PX).toBe(768);
    expect(MOBILE_QUERY).toBe("(max-width: 768px)");
  });

  it("returns the initial match state", () => {
    installMatchMedia(true);
    render(<Probe query={MOBILE_QUERY} />);
    expect(screen.getByText("match")).toBeInTheDocument();
  });

  it("reacts to a media change event (rotate / resize into mobile)", () => {
    const mm = installMatchMedia(false);
    render(<Probe query={MOBILE_QUERY} />);
    expect(screen.getByText("no-match")).toBeInTheDocument();

    mm.setMatches(true);
    expect(screen.getByText("match")).toBeInTheDocument();

    mm.setMatches(false);
    expect(screen.getByText("no-match")).toBeInTheDocument();
  });

  it("removes its listener on unmount", () => {
    const mm = installMatchMedia(false);
    const view = render(<Probe query={MOBILE_QUERY} />);
    expect(mm.listenerCount()).toBe(1);
    view.unmount();
    expect(mm.listenerCount()).toBe(0);
  });
});
