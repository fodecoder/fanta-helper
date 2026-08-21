import fs from "node:fs";
import type { ValuationImportReport } from "@fanta-helper/shared";
import { resolveDefaultValuationsFile } from "./defaultValuationFiles";
import { importValuationEntries } from "./valuationJson";

export { resolveDefaultValuationsFile } from "./defaultValuationFiles";

// Non deve mai bloccare la creazione della lega: un file di default
// mancante/corrotto è solo un warning, la lega nasce comunque vuota come oggi.
export async function seedDefaultValuationsForLeague(
  leagueId: number,
  nSquadre: number,
): Promise<ValuationImportReport | null> {
  const filePath = resolveDefaultValuationsFile(nSquadre);
  if (!filePath) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { players?: unknown };
    const players = Array.isArray(raw.players) ? raw.players : [];
    if (players.length === 0) return null;
    return await importValuationEntries(leagueId, players);
  } catch (err) {
    console.error(`[defaultValuations] seed fallito per lega ${leagueId} (${filePath})`, err);
    return null;
  }
}
