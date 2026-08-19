import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import type { SetPieceTakerConfirmEntry } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { replaceSetPieceTakersForTeam } from "../db/setPieceTaker";
import { extractSetPieceTakersFromPdfText } from "../import/setPieceTakerPdfImport";
import { resolveDocsDir } from "./docsPath";

const PDF_FILENAME = "Rigoristi e tiratori da fermo Serie A.pdf";

async function seedHistoricalSetPieceTakers(): Promise<void> {
  const docsDir = resolveDocsDir();
  const pdfPath = path.join(docsDir, PDF_FILENAME);
  if (!fs.existsSync(pdfPath)) {
    console.log(`File non trovato: ${pdfPath}`);
    return;
  }

  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  let fullText: string;
  try {
    const textResult = await parser.getText();
    fullText = textResult.text;
  } finally {
    await parser.destroy();
  }

  const { rows, discarded } = await extractSetPieceTakersFromPdfText(fullText);

  // Righe "uncertain" non vengono mai scritte nel DB: solo riportate a
  // console. La pagina "Rigoristi e calci piazzati" resta la fonte di
  // correzione — il PDF è solo il seme iniziale.
  const kept = rows.filter((row) => !row.uncertain);
  const uncertain = rows.filter((row) => row.uncertain);

  if (discarded.length > 0) {
    console.log(`${discarded.length} righe scartate dall'estrazione (JSON non interpretabile):`);
    console.table(discarded);
  }
  if (uncertain.length > 0) {
    console.log(`${uncertain.length} righe incerte, NON scritte nel DB (revisione manuale consigliata):`);
    console.table(uncertain);
  }

  const byTeam = new Map<string, SetPieceTakerConfirmEntry[]>();
  for (const row of kept) {
    const entries = byTeam.get(row.team) ?? [];
    entries.push({ tipo: row.tipo, player_name: row.player_name, rank: row.rank });
    byTeam.set(row.team, entries);
  }

  for (const [team, entries] of byTeam) {
    try {
      await replaceSetPieceTakersForTeam(team, entries);
      console.log(`[set_piece_taker] ${team}: scritte ${entries.length} righe`);
    } catch (err) {
      console.error(`[set_piece_taker] ${team}: scrittura fallita`, err);
    }
  }
}

seedHistoricalSetPieceTakers()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
