import { ROLES } from "./roles";
import type { Role } from "./roles";

// 90% della quota target del reparto: soglia oltre cui l'avviso passa da "ok"
// a "in avvicinamento".
export const ROLE_BUDGET_APPROACH_THRESHOLD = 0.9;

export type RoleBudgetState = "ok" | "approaching" | "over";

export interface RoleBudgetStatus {
  ruolo: Role;
  spent: number;
  targetPercent: number;
  targetCredits: number;
  residuo: number;
  state: RoleBudgetState;
}

export function computeRoleBudget(
  budget: number,
  targetByRole: Record<Role, number>,
  spentByRole: Record<Role, number>,
): RoleBudgetStatus[] {
  return ROLES.map((ruolo) => {
    const targetPercent = targetByRole[ruolo];
    const targetCredits = Math.round((targetPercent / 100) * budget);
    const spent = spentByRole[ruolo];
    const residuo = targetCredits - spent;
    const state: RoleBudgetState =
      spent > targetCredits
        ? "over"
        : spent >= ROLE_BUDGET_APPROACH_THRESHOLD * targetCredits && targetCredits > 0
          ? "approaching"
          : "ok";
    return { ruolo, spent, targetPercent, targetCredits, residuo, state };
  });
}
