import { z } from "zod";

// Set predefinito: nessun upload di immagini. L'avatar è un carattere emoji
// scelto da questa lista; il colore è una delle tinte qui sotto. La
// validazione a whitelist rifiuta qualunque valore fuori set.
export const AVATAR_EMOJIS = [
  "🦊",
  "🐺",
  "🦁",
  "🐻",
  "🐼",
  "🦅",
  "🦉",
  "🐬",
  "🐙",
  "🦄",
  "🐝",
  "🦈",
  "🐢",
  "🐉",
  "🦖",
  "👾",
] as const;
export type AvatarEmoji = (typeof AVATAR_EMOJIS)[number];

export const AVATAR_COLORS = [
  "#e11d48",
  "#f97316",
  "#f59e0b",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const updateProfileSchema = z.object({
  avatar: z.enum(AVATAR_EMOJIS).nullable(),
  avatar_color: z.enum(AVATAR_COLORS).nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
