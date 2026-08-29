import type { ChatMessage, SendMessageInput, User } from "@fanta-helper/shared";
import { apiFetch } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL;

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export class ChatApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorPayload,
  ) {
    super(payload.error.message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ChatApiError(res.status, (await res.json()) as ApiErrorPayload);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function listUsers(signal?: AbortSignal): Promise<User[]> {
  return apiFetch(`${BASE_URL}/users`, { signal }).then((res) => handle<User[]>(res));
}

export function fetchConversation(
  withId: number,
  since?: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ with: String(withId) });
  if (since) {
    params.set("since", since);
  }
  return apiFetch(`${BASE_URL}/chat?${params.toString()}`, { signal }).then((res) =>
    handle<ChatMessage[]>(res),
  );
}

export function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  return apiFetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle<ChatMessage>(res));
}
