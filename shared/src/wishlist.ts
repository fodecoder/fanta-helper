import { z } from "zod";
import { roleSchema } from "./roles";

export const addWishlistEntrySchema = z.object({
  player_id: z.number().int().positive(),
});
export type AddWishlistEntryInput = z.infer<typeof addWishlistEntrySchema>;

export const updateWishlistEntrySchema = z.object({
  note: z.string().trim().nullable().optional(),
});
export type UpdateWishlistEntryInput = z.infer<typeof updateWishlistEntrySchema>;

export const reorderWishlistSchema = z.object({
  player_ids: z.array(z.number().int().positive()).min(1),
});
export type ReorderWishlistInput = z.infer<typeof reorderWishlistSchema>;

export const wishlistEntrySchema = z.object({
  league_id: z.number().int().positive(),
  player_id: z.number().int().positive(),
  priority: z.number().int().nullable(),
  note: z.string().nullable(),
});
export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;

export const wishlistEntryWithPlayerSchema = wishlistEntrySchema.extend({
  name: z.string(),
  team: z.string(),
  ruolo: roleSchema,
  image_url: z.string().nullable(),
});
export type WishlistEntryWithPlayer = z.infer<typeof wishlistEntryWithPlayerSchema>;
