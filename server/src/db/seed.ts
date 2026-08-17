import { defaultScoring, defaultModificatori, defaultRosterConfig, DEFAULT_BUDGET } from "@fanta-helper/shared";
import { pool } from "./client";
import { insertLeague } from "./leagues";
import { insertPlayer } from "./players";
import { insertValuation } from "./valuations";
import { insertManager } from "./managers";
import { insertPurchase } from "./purchases";
import { getManagerAuctionStatuses } from "./derived";

async function seed(): Promise<void> {
  const league = await insertLeague({
    name: "Lega Demo",
    n_squadre: 8,
    budget: DEFAULT_BUDGET,
    roster_config: defaultRosterConfig,
    scoring: defaultScoring,
    modificatori: defaultModificatori,
  });

  const goalkeeper = await insertPlayer({ name: "Mario Rossi", team: "Demo FC", ruolo: "P", image_url: null });
  const defender = await insertPlayer({ name: "Luca Bianchi", team: "Demo FC", ruolo: "D", image_url: null });
  const striker = await insertPlayer({ name: "Paolo Verdi", team: "Demo United", ruolo: "A", image_url: null });

  await insertValuation({
    league_id: league.id,
    player_id: goalkeeper.id,
    tier: "1",
    target: 5,
    fair_value: 6,
    max_bid: 8,
    panic_price: 12,
    confidence: "high",
    note: null,
  });
  await insertValuation({
    league_id: league.id,
    player_id: striker.id,
    tier: "1",
    target: 40,
    fair_value: 45,
    max_bid: 55,
    panic_price: 70,
    confidence: "medium",
    note: "Titolare confermato",
  });

  const managerA = await insertManager({ league_id: league.id, name: "Manager A" });
  const managerB = await insertManager({ league_id: league.id, name: "Manager B" });

  await insertPurchase({ league_id: league.id, player_id: goalkeeper.id, manager_id: managerA.id, prezzo: 7 });
  await insertPurchase({ league_id: league.id, player_id: striker.id, manager_id: managerB.id, prezzo: 48 });
  await insertPurchase({ league_id: league.id, player_id: defender.id, manager_id: managerA.id, prezzo: 3 });

  const statuses = await getManagerAuctionStatuses(league.id);
  console.log(`Seeded league "${league.name}" (id=${league.id}). Manager budget status:`);
  for (const status of statuses) {
    console.log(
      `  ${status.managerName}: budget=${status.budget} spent=${status.spent} residuo=${status.residuo}`,
    );
  }
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
