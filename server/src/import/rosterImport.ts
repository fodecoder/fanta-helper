import type {
  DiscardedRosterRow,
  RosterImportPreviewResult,
  RosterImportReport,
} from "@fanta-helper/shared";
import { pool } from "../db/client";
import { listManagersByLeague } from "../db/managers";
import { listPlayers } from "../db/players";
import { replacePurchasesForLeagueTx } from "../db/purchases";
import type { ManagerRow } from "../db/types";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows } from "./fileRows";
import { parseNullableInt } from "./numeric";
import { buildPlayerIndex } from "./referenceMatch";
import { diceCoefficient } from "./stringSimilarity";

// Soglia minima di similarità nome per proporre un manager nella preview: sotto
// questo valore il suggerimento resta vuoto (l'utente sceglie a mano).
const SIMILARITY_THRESHOLD = 0.3;

function isSeparatorRow(values: string[]): boolean {
  return values.length === 3 && values.every((value) => value === "$");
}

interface CsvBlockRow {
  rowNumber: number;
  fantaIdRaw: string;
  prezzoRaw: string;
}

interface CsvBlock {
  csvTeamName: string;
  rows: CsvBlockRow[];
}

// Il CSV delle leghe Fantacalcio è a blocchi separati da righe `$,$,$`; dentro
// ogni blocco la colonna 0 (nome squadra) è ripetuta su ogni riga. Qui i blocchi
// vengono aggregati per nome squadra: il mapping dell'import è per nome, non per
// blocco fisico, quindi due blocchi con lo stesso nome collassano in uno.
function splitBlocks(rawRows: unknown[][]): CsvBlock[] {
  const byName = new Map<string, CsvBlock>();
  let currentName: string | null = null;

  rawRows.forEach((cells, index) => {
    const values = cells.map(cell);
    if (isSeparatorRow(values)) {
      currentName = null;
      return;
    }

    const teamName = cell(values[0]);
    if (currentName === null) {
      currentName = teamName;
    }
    const key = currentName;

    let block = byName.get(key);
    if (!block) {
      block = { csvTeamName: key, rows: [] };
      byName.set(key, block);
    }
    block.rows.push({
      rowNumber: index + 1,
      fantaIdRaw: cell(values[1]),
      prezzoRaw: cell(values[2]),
    });
  });

  return [...byName.values()];
}

function bestManagerMatch(
  csvTeamName: string,
  managers: ManagerRow[],
): { id: number; name: string } | null {
  let best: { id: number; name: string; score: number } | null = null;
  for (const manager of managers) {
    const score = diceCoefficient(csvTeamName, manager.name);
    if (score > SIMILARITY_THRESHOLD && (best === null || score > best.score)) {
      best = { id: manager.id, name: manager.name, score };
    }
  }
  return best ? { id: best.id, name: best.name } : null;
}

// Fase 1: parsa i blocchi e propone per ciascun nome squadra il manager di lega
// più simile per nome (Dice sui bigrammi). Nessuna scrittura DB, nessun match
// giocatore: serve solo a costruire il mapping che l'utente conferma.
export async function previewRosterImport(
  leagueId: number,
  raw: string,
): Promise<RosterImportPreviewResult> {
  const rawRows = parseCsvRows(raw, ",");
  if (rawRows.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const managers = await listManagersByLeague(leagueId);
  const blocks = splitBlocks(rawRows);

  return {
    blocks: blocks.map((block) => {
      const match = bestManagerMatch(block.csvTeamName, managers);
      return {
        csvTeamName: block.csvTeamName,
        rowCount: block.rows.length,
        suggestedManagerId: match?.id ?? null,
        suggestedManagerName: match?.name ?? null,
      };
    }),
  };
}

// Fase 2: stesso parsing e stesso match giocatore per fanta_id della preview, ma
// il manager di ogni blocco è risolto dal `mapping` (nome squadra CSV →
// managerId) confermato dall'utente, non dal confronto per nome. Import a
// sostituzione: ricostruisce l'intero log purchase della lega in transazione,
// mai un append. Un blocco senza entry nel mapping non blocca l'import: tutte le
// sue righe finiscono nel report di scarto.
export async function commitRosterImport(
  leagueId: number,
  raw: string,
  mapping: Record<string, number>,
): Promise<RosterImportReport> {
  const seenManagerIds = new Set<number>();
  for (const managerId of Object.values(mapping)) {
    if (seenManagerIds.has(managerId)) {
      throw ApiError.badRequest(
        "mapping non valido: un manager non può ricevere più di un blocco",
      );
    }
    seenManagerIds.add(managerId);
  }

  const rawRows = parseCsvRows(raw, ",");
  if (rawRows.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const managers = await listManagersByLeague(leagueId);
  const managersById = new Map<number, ManagerRow>(managers.map((m) => [m.id, m]));
  for (const managerId of Object.values(mapping)) {
    if (!managersById.has(managerId)) {
      throw ApiError.badRequest(
        `mapping non valido: manager ${managerId} non appartiene alla lega`,
      );
    }
  }

  const playerIndex = buildPlayerIndex(await listPlayers());
  const blocks = splitBlocks(rawRows);

  const discarded: DiscardedRosterRow[] = [];
  const unmappedTeams = new Set<string>();
  const seenPlayerIds = new Set<number>();
  const resolved: { player_id: number; manager_id: number; prezzo: number }[] = [];

  for (const block of blocks) {
    const managerId = Object.prototype.hasOwnProperty.call(mapping, block.csvTeamName)
      ? mapping[block.csvTeamName]
      : undefined;
    const manager = managerId === undefined ? undefined : managersById.get(managerId);

    for (const row of block.rows) {
      const discard = (reason: string) => {
        discarded.push({
          row: row.rowNumber,
          managerName: block.csvTeamName,
          fantaId: row.fantaIdRaw,
          prezzo: row.prezzoRaw,
          reason,
        });
      };

      if (!manager) {
        unmappedTeams.add(block.csvTeamName);
        discard("blocco non mappato a un manager");
        continue;
      }

      const parsedFantaId = parseNullableInt(row.fantaIdRaw);
      if (!parsedFantaId.ok || parsedFantaId.value === null) {
        discard("fanta_id non numerico");
        continue;
      }
      const player = playerIndex.byFantaId.get(parsedFantaId.value);
      if (!player) {
        discard("fanta_id non risolve alcun giocatore nel pool");
        continue;
      }

      const parsedPrezzo = parseNullableInt(row.prezzoRaw);
      if (!parsedPrezzo.ok || parsedPrezzo.value === null) {
        discard("prezzo non numerico");
        continue;
      }
      if (parsedPrezzo.value < 0) {
        discard("prezzo negativo");
        continue;
      }

      if (seenPlayerIds.has(player.id)) {
        discard("giocatore già presente in una riga precedente del file");
        continue;
      }
      seenPlayerIds.add(player.id);

      resolved.push({ player_id: player.id, manager_id: manager.id, prezzo: parsedPrezzo.value });
    }
  }

  if (resolved.length === 0) {
    throw ApiError.badRequest("no valid rows to import; existing roster left untouched");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const imported = await replacePurchasesForLeagueTx(client, leagueId, resolved);
    await client.query("COMMIT");
    return { imported, discarded, unknownManagers: [...unmappedTeams].sort() };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
