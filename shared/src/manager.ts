import { z } from "zod";

// Default name for the auto-created owner manager at league setup. Editable
// afterwards — it is NOT an identity key, see `Manager.is_owner`.
export const OWNER_MANAGER_NAME = "Io";

export const createManagerSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
});
export type CreateManagerInput = z.infer<typeof createManagerSchema>;

export const updateManagerSchema = createManagerSchema;
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;

export const managerSchema = createManagerSchema.extend({
  id: z.number().int().positive(),
  league_id: z.number().int().positive(),
  is_owner: z.boolean(),
  user_id: z.number().int().positive().nullable(),
});
export type Manager = z.infer<typeof managerSchema>;
