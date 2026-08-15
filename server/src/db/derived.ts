import { pool } from "./client";

export interface ManagerBudgetStatus {
  managerId: number;
  managerName: string;
  budget: number;
  spent: number;
  residuo: number;
}

// `residuo` is never stored: it is always the league budget minus the sum of
// this manager's rows in the immutable `purchase` log, recomputed here.
export async function getManagerBudgetStatuses(leagueId: number): Promise<ManagerBudgetStatus[]> {
  const result = await pool.query<{
    manager_id: number;
    manager_name: string;
    budget: number;
    spent: string;
  }>(
    `SELECT
       manager.id AS manager_id,
       manager.name AS manager_name,
       league.budget AS budget,
       COALESCE(SUM(purchase.prezzo), 0) AS spent
     FROM manager
     JOIN league ON league.id = manager.league_id
     LEFT JOIN purchase ON purchase.manager_id = manager.id AND purchase.league_id = manager.league_id
     WHERE manager.league_id = $1
     GROUP BY manager.id, manager.name, league.budget
     ORDER BY manager.name`,
    [leagueId],
  );

  return result.rows.map((row) => {
    const spent = Number(row.spent);
    return {
      managerId: row.manager_id,
      managerName: row.manager_name,
      budget: row.budget,
      spent,
      residuo: row.budget - spent,
    };
  });
}
