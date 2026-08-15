export const ROLES = ["P", "D", "C", "A"] as const;
export type Role = (typeof ROLES)[number];
