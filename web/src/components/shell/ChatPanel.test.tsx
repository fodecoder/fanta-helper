import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@fanta-helper/shared";
import { ChatPanel } from "./ChatPanel";
import * as chatApi from "../../api/chat";

vi.mock("../../api/chat", () => ({
  listUsers: vi.fn(),
  fetchInbox: vi.fn(),
  fetchConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

const me: User = { id: 1, username: "Me", avatar: null, avatar_color: null };

function setViewport(isMobile: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isMobile && query.includes("max-width"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(chatApi.listUsers).mockResolvedValue([]);
  vi.mocked(chatApi.fetchInbox).mockResolvedValue([]);
  vi.mocked(chatApi.fetchConversation).mockResolvedValue([]);
});

describe("ChatPanel responsive container", () => {
  it("opens fullscreen on mobile: no drag geometry, no resize handle", async () => {
    setViewport(true);
    const user = userEvent.setup();
    const { container } = render(<ChatPanel currentUser={me} />);

    await user.click(screen.getByRole("button", { name: /apri chat/i }));

    const panel = container.querySelector(".chat-panel")!;
    expect(panel).toHaveClass("chat-panel--mobile");
    expect(panel.getAttribute("style")).toBeFalsy();
    expect(container.querySelector(".chat-panel__resize")).toBeNull();
    // un solo bottone di chiusura
    expect(screen.getByRole("button", { name: /chiudi chat/i })).toBeInTheDocument();
  });

  it("stays a floating, resizable panel on desktop", async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<ChatPanel currentUser={me} />);

    await user.click(screen.getByRole("button", { name: /apri chat/i }));

    const panel = container.querySelector(".chat-panel") as HTMLElement;
    expect(panel).not.toHaveClass("chat-panel--mobile");
    expect(panel.style.left).not.toBe("");
    expect(panel.style.width).not.toBe("");
    expect(container.querySelector(".chat-panel__resize")).not.toBeNull();
  });
});
