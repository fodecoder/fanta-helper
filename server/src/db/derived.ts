import { pool } from "./client";
import { ROLES } from "@fanta-helper/shared";
import type { ManagerAuctionStatus, RoleSlotStatus, RosterConfig } from "@fanta-helper/shared";

// Budget, spesa e slot per reparto non sono mai memorizzati: sono sempre
// ricavati dalla lega (budget, roster_config) e dalla somma/conteggio delle
// righe di questo manager nel log immutabile `purchase`, ricalcolati qui.
export async function getManagerAuctionStatuses(leagueId: number): Promise<ManagerAuctionStatus[]> {
  const result = await pool.query<{
    manager_id: number;
    manager_name: string;
    budget: number;
    roster_config: RosterConfig;
    spent: string;
    used_p: string;
    used_d: string;
    used_c: string;
    used_a: string;
  }>(
    `SELECT
       manager.id AS manager_id,
       manager.name AS manager_name,
       league.budget AS budget,
       league.roster_config AS roster_config,
       COALESCE(SUM(purchase.prezzo), 0) AS spent,
       COUNT(*) FILTER (WHERE player.ruolo = 'P') AS used_p,
       COUNT(*) FILTER (WHERE player.ruolo = 'D') AS used_d,
       COUNT(*) FILTER (WHERE player.ruolo = 'C') AS used_c,
       COUNT(*) FILTER (WHERE player.ruolo = 'A') AS used_a
     FROM manager
     JOIN league ON league.id = manager.league_id
     LEFT JOIN purchase ON purchase.manager_id = manager.id AND purchase.league_id = manager.league_id
     LEFT JOIN player ON player.id = purchase.player_id
     WHERE manager.league_id = $1
     GROUP BY manager.id, manager.name, league.budget, league.roster_config
     ORDER BY manager.name`,
    [leagueId],
  );

  const usedByRole: Record<(typeof ROLES)[number], "used_p" | "used_d" | "used_c" | "used_a"> = {
    P: "used_p",
    D: "used_d",
    C: "used_c",
    A: "used_a",
  };

  return result.rows.map((row) => {
    const spent = Number(row.spent);
    const slots: RoleSlotStatus[] = ROLES.map((ruolo) => {
      const total = row.roster_config[ruolo];
      const used = Number(row[usedByRole[ruolo]]);
      return { ruolo, total, used, free: total - used };
    });

    return {
      managerId: row.manager_id,
      managerName: row.manager_name,
      budget: row.budget,
      spent,
      residuo: row.budget - spent,
      slots,
    };
  });
}
