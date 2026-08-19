import fs from "node:fs";
import path from "node:path";
import { pool } from "../db/client";
import { importPlayerSeasonStatsFromXlsx } from "../import/playerSeasonStatsImport";
import { parseSeasonFromFilename } from "../import/season";
import { resolveDocsDir } from "./docsPath";

const FILE_PREFIX = "Statistiche_Fantacalcio_Stagione_";

async function seedHistoricalStats(): Promise<void> {
  const docsDir = resolveDocsDir();
  // parseSeasonFromFilename è ancorata a fine stringa ("_AAAA_AA.xlsx"), quindi
  // filtra automaticamente le varianti _Italia/_Statistico: solo la base
  // (fonte Fantacalcio) è canonica.
  const files = fs
    .readdirSync(docsDir)
    .filter((name) => name.startsWith(FILE_PREFIX) && parseSeasonFromFilename(name) !== null)
    .sort();

  if (files.length === 0) {
    console.log(`Nessun file statistiche (variante base) trovato in ${docsDir}`);
    return;
  }

  for (const file of files) {
    const season = parseSeasonFromFilename(file);
    if (season === null) continue;
    try {
      const buffer = fs.readFileSync(path.join(docsDir, file));
      const report = await importPlayerSeasonStatsFromXlsx(buffer, season);
      console.log(
        `[player_season_stats] ${season}: scritte ${report.written}, scartate ${report.discarded.length}`,
      );
      if (report.discarded.length > 0) {
        console.table(report.discarded);
      }
    } catch (err) {
      console.error(`[player_season_stats] ${season}: import fallito`, err);
    }
  }
}

seedHistoricalStats()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
