import type { DiscardedRosterRow, RosterImportReport } from "@fanta-helper/shared";
import { pool } from "../db/client";
import { listManagersByLeague } from "../db/managers";
import { listPlayers } from "../db/players";
import { replacePurchasesForLeagueTx } from "../db/purchases";
import type { ManagerRow } from "../db/types";
import { ApiError } from "../http/errors";
import { cell, parseCsvRows } from "./fileRows";
import { parseNullableInt } from "./numeric";
import { buildPlayerIndex } from "./referenceMatch";

function normalizeManagerName(name: string): string {
  return name.trim().toLowerCase();
}

function isSeparatorRow(values: string[]): boolean {
  return values.length === 3 && values.every((value) => value === "$");
}

// Import rose a sostituzione: il CSV è sempre uno snapshot completo della
// rosa, quindi ricostruisce l'intero log purchase della lega in
// transazione — mai un append. fanta_id-only per il match giocatore (colonna
// 2 del formato), manager per nome (nessuna creazione automatica: un nome
// sconosciuto finisce nel report di scarto).
export async function importRosterFromCsv(leagueId: number, raw: string): Promise<RosterImportReport> {
  const rawRows = parseCsvRows(raw, ",");
  if (rawRows.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const managers = await listManagersByLeague(leagueId);
  const managersByName = new Map<string, ManagerRow[]>();
  for (const manager of managers) {
    const key = normalizeManagerName(manager.name);
    const bucket = managersByName.get(key);
    if (bucket) {
      bucket.push(manager);
    } else {
      managersByName.set(key, [manager]);
    }
  }

  const playerIndex = buildPlayerIndex(await listPlayers());

  const discarded: DiscardedRosterRow[] = [];
  const unknownManagers = new Set<string>();
  const seenPlayerIds = new Set<number>();
  const resolved: { player_id: number; manager_id: number; prezzo: number }[] = [];

  rawRows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const values = cells.map(cell);
    if (isSeparatorRow(values)) return;

    const managerName = cell(values[0]);
    const fantaIdRaw = cell(values[1]);
    const prezzoRaw = cell(values[2]);
    const discard = (reason: string) => {
      discarded.push({ row: rowNumber, managerName, fantaId: fantaIdRaw, prezzo: prezzoRaw, reason });
    };

    if (managerName === "") {
      discard("nome manager mancante");
      return;
    }

    const candidates = managersByName.get(normalizeManagerName(managerName)) ?? [];
    if (candidates.length === 0) {
      unknownManagers.add(managerName);
      discard("manager sconosciuto nella lega");
      return;
    }
    if (candidates.length > 1) {
      discard("nome manager ambiguo (più manager con lo stesso nome nella lega)");
      return;
    }
    const manager = candidates[0]!;

    const parsedFantaId = parseNullableInt(fantaIdRaw);
    if (!parsedFantaId.ok || parsedFantaId.value === null) {
      discard("fanta_id non numerico");
      return;
    }
    const player = playerIndex.byFantaId.get(parsedFantaId.value);
    if (!player) {
      discard("fanta_id non risolve alcun giocatore nel pool");
      return;
    }

    const parsedPrezzo = parseNullableInt(prezzoRaw);
    if (!parsedPrezzo.ok || parsedPrezzo.value === null) {
      discard("prezzo non numerico");
      return;
    }
    if (parsedPrezzo.value < 0) {
      discard("prezzo negativo");
      return;
    }

    if (seenPlayerIds.has(player.id)) {
      discard("giocatore già presente in una riga precedente del file");
      return;
    }
    seenPlayerIds.add(player.id);

    resolved.push({ player_id: player.id, manager_id: manager.id, prezzo: parsedPrezzo.value });
  });

  if (resolved.length === 0) {
    throw ApiError.badRequest("no valid rows to import; existing roster left untouched");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const imported = await replacePurchasesForLeagueTx(client, leagueId, resolved);
    await client.query("COMMIT");
    return { imported, discarded, unknownManagers: [...unknownManagers].sort() };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
