import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, User } from "@fanta-helper/shared";
import { fetchConversation, listUsers, sendMessage } from "../../api/chat";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { UserAvatar } from "../UserAvatar";

const STORAGE_KEY = "chat-panel:v1";
const POLL_MS = 2500;
const MIN_W = 260;
const MIN_H = 240;

interface PanelPrefs {
  open: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  withUserId: number | null;
}

const DEFAULT_PREFS: PanelPrefs = { open: false, x: 24, y: 96, w: 320, h: 420, withUserId: null };

function loadPrefs(): PanelPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<PanelPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: PanelPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage non disponibile: la posizione semplicemente non persiste.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ChatPanelProps {
  currentUser: User;
}

export function ChatPanel({ currentUser }: ChatPanelProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [prefs, setPrefs] = useState<PanelPrefs>(loadPrefs);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; base: PanelPrefs } | null>(
    null,
  );

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  // Lista destinatari: una fetch quando il pannello è aperto.
  useEffect(() => {
    if (!prefs.open) return;
    const controller = new AbortController();
    listUsers(controller.signal)
      .then(setUsers)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "impossibile caricare gli utenti");
      });
    return () => controller.abort();
  }, [prefs.open]);

  const withUserId = prefs.withUserId;

  const loadConversation = useCallback(
    (signal?: AbortSignal) => {
      if (withUserId === null) return Promise.resolve();
      return fetchConversation(withUserId, undefined, signal)
        .then((rows) => {
          setMessages(rows);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "impossibile caricare la conversazione");
        });
    },
    [withUserId],
  );

  // Polling: la conversazione è sempre il risultato dell'ultima GET completa,
  // riordinata dal server. Nessun merge, nessuno stato mutabile locale.
  useEffect(() => {
    if (!prefs.open || withUserId === null) {
      return;
    }
    const controller = new AbortController();
    void loadConversation(controller.signal);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void loadConversation(controller.signal);
    }, POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [prefs.open, withUserId, loadConversation]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onPointerDown = useCallback(
    (mode: "move" | "resize") => (event: React.PointerEvent) => {
      event.preventDefault();
      dragRef.current = { mode, startX: event.clientX, startY: event.clientY, base: prefs };
      const onMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (drag.mode === "move") {
          setPrefs((p) => ({
            ...p,
            x: clamp(drag.base.x + dx, 0, window.innerWidth - drag.base.w),
            y: clamp(drag.base.y + dy, 0, window.innerHeight - 40),
          }));
        } else {
          setPrefs((p) => ({
            ...p,
            w: clamp(drag.base.w + dx, MIN_W, window.innerWidth - drag.base.x),
            h: clamp(drag.base.h + dy, MIN_H, window.innerHeight - drag.base.y),
          }));
        }
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [prefs],
  );

  const otherUser = useMemo(
    () => users.find((u) => u.id === withUserId) ?? null,
    [users, withUserId],
  );

  function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || withUserId === null) return;
    setDraft("");
    sendMessage({ to: withUserId, body })
      .then(() => loadConversation())
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "invio non riuscito");
        setDraft(body);
      });
  }

  if (!prefs.open) {
    return (
      <button
        type="button"
        className="btn btn-primary chat-fab"
        onClick={() => setPrefs((p) => ({ ...p, open: true }))}
        aria-label="Apri chat"
      >
        Chat
      </button>
    );
  }

  return (
    <section
      className={isMobile ? "chat-panel chat-panel--mobile" : "chat-panel"}
      style={
        isMobile
          ? undefined
          : { left: prefs.x, top: prefs.y, width: prefs.w, height: prefs.h }
      }
    >
      <header
        className="chat-panel__header"
        onPointerDown={isMobile ? undefined : onPointerDown("move")}
      >
        <span className="chat-panel__title">Chat</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setPrefs((p) => ({ ...p, open: false }))}
          aria-label="Chiudi chat"
        >
          ×
        </button>
      </header>

      <div className="chat-panel__recipient">
        <select
          className="input"
          value={withUserId ?? ""}
          onChange={(e) => {
            setMessages([]);
            setPrefs((p) => ({ ...p, withUserId: e.target.value ? Number(e.target.value) : null }));
          }}
        >
          <option value="">Scegli un destinatario…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </div>

      <div className="chat-panel__messages" ref={messagesRef}>
        {withUserId === null ? (
          <p className="chat-panel__hint">Seleziona un utente per iniziare.</p>
        ) : messages.length === 0 ? (
          <p className="chat-panel__hint">Nessun messaggio.</p>
        ) : (
          messages.map((m) => {
            const mine = m.from_user === currentUser.id;
            return (
              <div
                key={m.id}
                className={`chat-msg ${mine ? "chat-msg--mine" : "chat-msg--theirs"}`}
              >
                {!mine && otherUser ? <UserAvatar user={otherUser} size="sm" /> : null}
                <span className="chat-msg__bubble">
                  {m.body}
                  <time className="chat-msg__time">{formatTime(m.created_at)}</time>
                </span>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="chat-panel__error">{error}</p> : null}

      <form className="chat-panel__compose" onSubmit={handleSend}>
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Scrivi un messaggio…"
          maxLength={2000}
          disabled={withUserId === null}
        />
        <button type="submit" className="btn btn-primary" disabled={withUserId === null || !draft.trim()}>
          Invia
        </button>
      </form>

      {!isMobile && (
        <span
          className="chat-panel__resize"
          onPointerDown={onPointerDown("resize")}
          aria-hidden="true"
        />
      )}
    </section>
  );
}
