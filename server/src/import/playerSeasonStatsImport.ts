import type {
  PlayerSeasonStatsImportReport,
  PlayerSeasonStatsRow,
  DiscardedReferenceRow,
} from "@fanta-helper/shared";
import { listPlayers, backfillPlayerFantaId } from "../db/players";
import { pool } from "../db/client";
import { replacePlayerSeasonStatsForSeasonTx } from "../db/playerSeasonStats";
import { ApiError } from "../http/errors";
import { cell, parseXlsxRows, rowsToRecords } from "./fileRows";
import { buildPlayerIndex, matchPlayerRow } from "./referenceMatch";
import { parseNullableInt, parseNullableDecimal } from "./numeric";

const REQUIRED_COLUMNS = [
  "Id",
  "Nome",
  "Squadra",
  "Pv",
  "Mv",
  "Fm",
  "Gf",
  "Gs",
  "Rp",
  "Rc",
  "R+",
  "R-",
  "Ass",
  "Amm",
  "Esp",
  "Au",
] as const;

export async function importPlayerSeasonStatsFromXlsx(
  buffer: Buffer,
  season: string,
): Promise<PlayerSeasonStatsImportReport> {
  const records = rowsToRecords(parseXlsxRows(buffer), REQUIRED_COLUMNS);
  if (records.length === 0) {
    throw ApiError.badRequest("file has no data rows");
  }

  const index = buildPlayerIndex(await listPlayers());
  const rows: PlayerSeasonStatsRow[] = [];
  const discarded: DiscardedReferenceRow[] = [];
  const backfills: { player_id: number; fanta_id: number }[] = [];
  const claimedFantaIds = new Set(index.byFantaId.keys());

  records.forEach((record, i) => {
    const rowNumber = i + 1;
    const fantaIdRaw = cell(record.Id);
    const name = cell(record.Nome);
    const team = cell(record.Squadra);

    const match = matchPlayerRow(index, fantaIdRaw, name, team);
    if (match.status === "discarded") {
      discarded.push({ row: rowNumber, fanta_id: fantaIdRaw || null, name, team, reason: match.reason });
      return;
    }

    const parsedInts = {
      presenze: parseNullableInt(cell(record.Pv)),
      gf: parseNullableInt(cell(record.Gf)),
      gs: parseNullableInt(cell(record.Gs)),
      assist: parseNullableInt(cell(record.Ass)),
      rp: parseNullableInt(cell(record.Rp)),
      rc: parseNullableInt(cell(record.Rc)),
      rig_plus: parseNullableInt(cell(record["R+"])),
      rig_minus: parseNullableInt(cell(record["R-"])),
      amm: parseNullableInt(cell(record.Amm)),
      esp: parseNullableInt(cell(record.Esp)),
      autogol: parseNullableInt(cell(record.Au)),
    };
    const mv = parseNullableDecimal(cell(record.Mv));
    const fm = parseNullableDecimal(cell(record.Fm));

    const allOk = Object.values(parsedInts).every((r) => r.ok) && mv.ok && fm.ok;
    if (!allOk) {
      discarded.push({
        row: rowNumber,
        fanta_id: fantaIdRaw || null,
        name,
        team,
        reason: "valore non numerico in una colonna statistica",
      });
      return;
    }

    rows.push({
      player_id: match.player.id,
      season,
      presenze: parsedInts.presenze.ok ? parsedInts.presenze.value : null,
      mv: mv.ok ? mv.value : null,
      fm: fm.ok ? fm.value : null,
      gf: parsedInts.gf.ok ? parsedInts.gf.value : null,
      gs: parsedInts.gs.ok ? parsedInts.gs.value : null,
      assist: parsedInts.assist.ok ? parsedInts.assist.value : null,
      rp: parsedInts.rp.ok ? parsedInts.rp.value : null,
      rc: parsedInts.rc.ok ? parsedInts.rc.value : null,
      rig_plus: parsedInts.rig_plus.ok ? parsedInts.rig_plus.value : null,
      rig_minus: parsedInts.rig_minus.ok ? parsedInts.rig_minus.value : null,
      amm: parsedInts.amm.ok ? parsedInts.amm.value : null,
      esp: parsedInts.esp.ok ? parsedInts.esp.value : null,
      autogol: parsedInts.autogol.ok ? parsedInts.autogol.value : null,
    });

    if (
      match.matchedBy === "name_team" &&
      match.fantaIdFromFile !== null &&
      match.player.fanta_id === null &&
      !claimedFantaIds.has(match.fantaIdFromFile)
    ) {
      backfills.push({ player_id: match.player.id, fanta_id: match.fantaIdFromFile });
      claimedFantaIds.add(match.fantaIdFromFile);
    }
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const backfill of backfills) {
      await backfillPlayerFantaId(backfill.player_id, backfill.fanta_id, client);
    }
    const written = await replacePlayerSeasonStatsForSeasonTx(client, season, rows);
    await client.query("COMMIT");
    return { season, written, discarded };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
