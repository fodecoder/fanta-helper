import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Forma pubblica di un utente: password_hash non compare mai qui né viene
// inviato al client.
export const USER_ROLES = ["member", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  avatar: z.string().nullable(),
  avatar_color: z.string().nullable(),
  // Assente sui payload precedenti alla migrazione `app-user-role`: trattare come
  // "member". `guest` = sola consultazione (enforcement lato API).
  role: z.enum(USER_ROLES).optional(),
});
export type User = z.infer<typeof userSchema>;
