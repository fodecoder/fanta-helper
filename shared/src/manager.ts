import { z } from "zod";

export const createManagerSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
});
export type CreateManagerInput = z.infer<typeof createManagerSchema>;

export const updateManagerSchema = createManagerSchema;
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;

export const managerSchema = createManagerSchema.extend({
  id: z.number().int().positive(),
  league_id: z.number().int().positive(),
});
export type Manager = z.infer<typeof managerSchema>;
