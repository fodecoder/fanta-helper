import type { RosterExportResult, RosterExportUnresolved } from "@fanta-helper/shared";
import { listPurchasesForRosterExport } from "../db/purchases";

function csvField(value: string): string {
  return /["\n,]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Proiezione pura del log purchase nel formato a blocchi $,$,$ delle leghe
// Fantacalcio ufficiali. Un acquisto senza fanta_id mappato non può essere
// tradotto in una riga valida per il gestionale esterno: finisce in
// `unresolved`, mai emesso come riga con id vuoto.
export async function buildRosterExportCsv(leagueId: number): Promise<RosterExportResult> {
  const rows = await listPurchasesForRosterExport(leagueId);

  const unresolved: RosterExportUnresolved[] = [];
  const managerBlocks = new Map<number, { name: string; lines: string[] }>();
  const managerOrder: number[] = [];

  for (const row of rows) {
    if (row.fanta_id === null) {
      unresolved.push({
        managerName: row.manager_name,
        playerId: row.player_id,
        playerName: row.player_name,
        reason: "nessun fanta_id mappato per questo giocatore",
      });
      continue;
    }

    let block = managerBlocks.get(row.manager_id);
    if (!block) {
      block = { name: row.manager_name, lines: [] };
      managerBlocks.set(row.manager_id, block);
      managerOrder.push(row.manager_id);
    }
    block.lines.push(`${csvField(row.manager_name)},${row.fanta_id},${row.prezzo}`);
  }

  const csvLines: string[] = [];
  let rowCount = 0;
  for (const managerId of managerOrder) {
    const block = managerBlocks.get(managerId)!;
    csvLines.push("$,$,$");
    csvLines.push(...block.lines);
    rowCount += block.lines.length;
  }

  return {
    csv: csvLines.length > 0 ? `${csvLines.join("\n")}\n` : "",
    rowCount,
    unresolved,
  };
}
