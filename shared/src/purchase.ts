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

export const managerAuctionStatusSchema = z.object({
  managerId: z.number().int().positive(),
  managerName: z.string(),
  budget: z.number().int(),
  spent: z.number().int().nonnegative(),
  residuo: z.number().int(),
  slots: z.array(roleSlotStatusSchema),
});
export type ManagerAuctionStatus = z.infer<typeof managerAuctionStatusSchema>;
