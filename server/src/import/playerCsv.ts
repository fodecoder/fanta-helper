import { parse } from "csv-parse/sync";
import { ROLES } from "@fanta-helper/shared";
import type { PlayerImportReport, DiscardedPlayerRow } from "@fanta-helper/shared";
import { upsertPlayer } from "../db/players";
import { ApiError } from "../http/errors";

const REQUIRED_COLUMNS = ["R", "Nome", "Squadra"] as const;

export async function importPlayersFromCsv(raw: string): Promise<PlayerImportReport> {
  const records = parse(raw, {
    delimiter: ";",
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw ApiError.badRequest("CSV has no data rows");
  }

  const header = Object.keys(records[0]!);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw ApiError.badRequest(`CSV is missing required columns: ${missingColumns.join(", ")}`);
  }

  let inserted = 0;
  let updated = 0;
  const discarded: DiscardedPlayerRow[] = [];

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 1;
    const name = (record.Nome ?? "").trim();
    const team = (record.Squadra ?? "").trim();
    const ruolo = (record.R ?? "").trim().toUpperCase();

    if (name === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "nome mancante" });
      continue;
    }
    if (team === "") {
      discarded.push({ row: rowNumber, name, team, ruolo, reason: "squadra mancante" });
      continue;
    }
    if (!(ROLES as readonly string[]).includes(ruolo)) {
      discarded.push({
        row: rowNumber,
        name,
        team,
        ruolo,
        reason: `ruolo non valido: '${ruolo}'`,
      });
      continue;
    }

    const { inserted: wasInserted } = await upsertPlayer({
      name,
      team,
      ruolo: ruolo as (typeof ROLES)[number],
    });
    if (wasInserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated, discarded };
}
