import { pool } from "./client";
import { ROLES, computeAdjustedMaxBid } from "@fanta-helper/shared";
import type { ManagerAuctionStatus, RoleSlotStatus, RosterConfig } from "@fanta-helper/shared";

// Budget, spesa e slot per reparto non sono mai memorizzati: sono sempre
// ricavati dalla lega (budget, roster_config) e dalla somma/conteggio delle
// righe di questo manager nel log immutabile `purchase`, ricalcolati qui.
export async function getManagerAuctionStatuses(leagueId: number): Promise<ManagerAuctionStatus[]> {
  const result = await pool.query<{
    manager_id: number;
    manager_name: string;
    manager_is_owner: boolean;
    user_name: string | null;
    user_avatar: string | null;
    user_avatar_color: string | null;
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
       manager.is_owner AS manager_is_owner,
       app_user.username AS user_name,
       app_user.avatar AS user_avatar,
       app_user.avatar_color AS user_avatar_color,
       league.budget AS budget,
       league.roster_config AS roster_config,
       COALESCE(SUM(purchase.prezzo), 0) AS spent,
       COUNT(*) FILTER (WHERE player.ruolo = 'P') AS used_p,
       COUNT(*) FILTER (WHERE player.ruolo = 'D') AS used_d,
       COUNT(*) FILTER (WHERE player.ruolo = 'C') AS used_c,
       COUNT(*) FILTER (WHERE player.ruolo = 'A') AS used_a
     FROM manager
     JOIN league ON league.id = manager.league_id
     LEFT JOIN app_user ON app_user.id = manager.user_id
     LEFT JOIN purchase ON purchase.manager_id = manager.id AND purchase.league_id = manager.league_id
     LEFT JOIN player ON player.id = purchase.player_id
     WHERE manager.league_id = $1
     GROUP BY manager.id, manager.name, manager.is_owner, app_user.username,
       app_user.avatar, app_user.avatar_color, league.budget, league.roster_config
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

    const residuo = row.budget - spent;

    return {
      managerId: row.manager_id,
      managerName: row.manager_name,
      isOwner: row.manager_is_owner,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      userAvatarColor: row.user_avatar_color,
      budget: row.budget,
      spent,
      residuo,
      slots,
      adjustedMaxBid: computeAdjustedMaxBid({ residuo, slots }),
    };
  });
}
