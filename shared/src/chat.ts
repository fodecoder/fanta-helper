import { z } from "zod";

export const sendMessageSchema = z.object({
  to: z.number().int().positive(),
  body: z.string().trim().min(1, "message is required").max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export interface ChatMessage {
  id: number;
  from_user: number;
  to_user: number;
  body: string;
  created_at: string;
}
