import { z } from "zod";
import { roleSchema } from "./roles";

export const createPurchaseSchema = z.object({
  player_id: z.number().int().positive(),
  manager_id: z.number().int().positive(),
  prezzo: z.number().int().nonnegative(),
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const purchaseSchema = createPurchaseSchema.extend({
  league_id: z.number().int().positive(),
  ts: z.string(),
});
export type Purchase = z.infer<typeof purchaseSchema>;

// Enriched log row for the auction event-log UI, joined with player/manager names.
export const purchaseWithDetailsSchema = purchaseSchema.extend({
  player_name: z.string(),
  player_team: z.string(),
  player_ruolo: roleSchema,
  player_image_url: z.string().nullable(),
  manager_name: z.string(),
});
export type PurchaseWithDetails = z.infer<typeof purchaseWithDetailsSchema>;

export const roleSlotStatusSchema = z.object({
  ruolo: roleSchema,
  total: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  free: z.number().int(),
});
export type RoleSlotStatus = z.infer<typeof roleSlotStatusSchema>;

export const roleBudgetStatusSchema = z.object({
  ruolo: roleSchema,
  spent: z.number().int(),
  targetPercent: z.number(),
  targetCredits: z.number().int(),
  residuo: z.number().int(),
  state: z.enum(["ok", "approaching", "over"]),
});
export type RoleBudgetStatusRow = z.infer<typeof roleBudgetStatusSchema>;

export const managerAuctionStatusSchema = z.object({
  managerId: z.number().int().positive(),
  managerName: z.string(),
  isOwner: z.boolean(),
  budget: z.number().int(),
  spent: z.number().int().nonnegative(),
  residuo: z.number().int(),
  slots: z.array(roleSlotStatusSchema),
  spentByRole: z.array(roleBudgetStatusSchema),
  adjustedMaxBid: z.number().int().nonnegative(),
  // Identità dell'utente collegato al manager (via manager.user_id), quando
  // presente: usata solo per mostrare l'avatar in panoramica.
  userName: z.string().nullable().optional(),
  userAvatar: z.string().nullable().optional(),
  userAvatarColor: z.string().nullable().optional(),
});
export type ManagerAuctionStatus = z.infer<typeof managerAuctionStatusSchema>;
