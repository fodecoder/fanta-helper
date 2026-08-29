import { z } from "zod";

export const sendMessageSchema = z.object({
  to: z.number().int().positive(),
  body: z.string().trim().min(1, "message is required").max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// GET /chat/inbox: messaggi ricevuti dall'utente dopo un istante. Serve alla
// notifica in-app; lo stato "non letto" resta derivato a lettura lato client
// (nessun campo di stato sul log append-only).
export const inboxQuerySchema = z.object({
  since: z.string().datetime(),
});

export interface ChatMessage {
  id: number;
  from_user: number;
  to_user: number;
  body: string;
  created_at: string;
}
