import fs from "node:fs";
import path from "node:path";
import { pool } from "../db/client";
import { importQuotationsFromXlsx } from "../import/quotationImport";
import { parseSeasonFromFilename } from "../import/season";
import { resolveDocsDir } from "./docsPath";

const FILE_PREFIX = "Quotazioni_Fantacalcio_Stagione_";

async function seedHistoricalQuotations(): Promise<void> {
  const docsDir = resolveDocsDir();
  const files = fs
    .readdirSync(docsDir)
    .filter((name) => name.startsWith(FILE_PREFIX) && parseSeasonFromFilename(name) !== null)
    .sort();

  if (files.length === 0) {
    console.log(`Nessun file quotazioni trovato in ${docsDir}`);
    return;
  }

  // Un file malformato non deve bloccare le stagioni restanti.
  for (const file of files) {
    const season = parseSeasonFromFilename(file);
    if (season === null) continue;
    try {
      const buffer = fs.readFileSync(path.join(docsDir, file));
      const report = await importQuotationsFromXlsx(buffer, season);
      console.log(
        `[quotation] ${season}: scritte ${report.written}, scartate ${report.discarded.length}`,
      );
      if (report.discarded.length > 0) {
        console.table(report.discarded);
      }
    } catch (err) {
      console.error(`[quotation] ${season}: import fallito`, err);
    }
  }
}

seedHistoricalQuotations()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
