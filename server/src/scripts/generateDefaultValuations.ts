import fs from "node:fs";
import path from "node:path";
import {
  ROLES,
  defaultModificatori,
  defaultRosterConfig,
  defaultScoring,
  generateDefaultValuations,
  type LeagueRulesConfig,
  type Player,
  type PlayerSeasonStatsRow,
  type QuotationRow,
  type Role,
} from "@fanta-helper/shared";
import { cell, parseXlsxRows, rowsToRecords } from "../import/fileRows";
import { parseNullableDecimal, parseNullableInt } from "../import/numeric";
import { buildPlayerIndex, matchPlayerRow } from "../import/referenceMatch";
import { parseSeasonFromFilename } from "../import/season";
import { resolveDocsDir } from "./docsPath";

// Rigenerazione deterministica dei listini di default (docs/sample/*.json),
// a copertura totale del pool. Nessuna dipendenza da Postgres né da Claude:
// pool + quotazioni dall'ultimo file quotazioni in docs/, statistiche
// dall'ultima stagione conclusa. Da rilanciare a mano a ogni nuova stagione.
//
// generated_at è fissato a una costante: è l'unico campo non deterministico
// dell'output e va tenuto stabile per rendere i file rigenerabili byte a byte.
const GENERATED_AT = "2026-08-31T00:00:00.000Z";

const QUOTATIONS_PREFIX = "Quotazioni_Fantacalcio_Stagione_";
const STATS_PREFIX = "Statistiche_Fantacalcio_Stagione_";

const QUOTATION_COLUMNS = ["Id", "R", "Nome", "Squadra", "Qt.A", "Qt.I", "FVM"] as const;
const STATS_COLUMNS = [
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

const rules: LeagueRulesConfig = {
  rosterConfig: defaultRosterConfig,
  scoring: defaultScoring,
  modificatori: defaultModificatori,
};

// Ultimo file (stagione più recente) tra le varianti base di un prefisso.
function latestSeasonFile(docsDir: string, prefix: string): { file: string; season: string } {
  const candidates = fs
    .readdirSync(docsDir)
    .filter((name) => name.startsWith(prefix) && parseSeasonFromFilename(name) !== null)
    .sort();
  const file = candidates.at(-1);
  if (!file) throw new Error(`nessun file "${prefix}*" in ${docsDir}`);
  return { file, season: parseSeasonFromFilename(file)! };
}

interface PoolData {
  players: Player[];
  quotations: QuotationRow[];
  quotationSeason: string;
}

function loadPool(docsDir: string): PoolData {
  const { file, season } = latestSeasonFile(docsDir, QUOTATIONS_PREFIX);
  const records = rowsToRecords(parseXlsxRows(fs.readFileSync(path.join(docsDir, file))), QUOTATION_COLUMNS);

  const players: Player[] = [];
  const quotations: QuotationRow[] = [];
  let id = 0;
  for (const record of records) {
    const name = cell(record.Nome);
    const team = cell(record.Squadra);
    const ruolo = cell(record.R).toUpperCase();
    if (name === "" || team === "" || !(ROLES as readonly string[]).includes(ruolo)) continue;

    id += 1;
    const fantaId = parseNullableInt(cell(record.Id));
    players.push({
      id,
      fanta_id: fantaId.ok ? fantaId.value : null,
      sofifa_id: null,
      name,
      nome_completo: null,
      team,
      ruolo: ruolo as Role,
      image_url: null,
    });

    const qtI = parseNullableInt(cell(record["Qt.I"]));
    const qtA = parseNullableInt(cell(record["Qt.A"]));
    const fvm = parseNullableInt(cell(record.FVM));
    quotations.push({
      player_id: id,
      season,
      qt_i: qtI.ok ? qtI.value : null,
      qt_a: qtA.ok ? qtA.value : null,
      fvm: fvm.ok ? fvm.value : null,
    });
  }

  return { players, quotations, quotationSeason: season };
}

function loadStats(docsDir: string, players: Player[]): { rows: PlayerSeasonStatsRow[]; season: string } {
  const { file, season } = latestSeasonFile(docsDir, STATS_PREFIX);
  const records = rowsToRecords(parseXlsxRows(fs.readFileSync(path.join(docsDir, file))), STATS_COLUMNS);
  const index = buildPlayerIndex(players);

  const rows: PlayerSeasonStatsRow[] = [];
  for (const record of records) {
    const match = matchPlayerRow(index, cell(record.Id), cell(record.Nome), cell(record.Squadra));
    if (match.status === "discarded") continue;

    const ints = {
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
    if (!Object.values(ints).every((r) => r.ok) || !mv.ok || !fm.ok) continue;

    rows.push({
      player_id: match.player.id,
      season,
      presenze: ints.presenze.ok ? ints.presenze.value : null,
      mv: mv.value,
      fm: fm.value,
      gf: ints.gf.ok ? ints.gf.value : null,
      gs: ints.gs.ok ? ints.gs.value : null,
      assist: ints.assist.ok ? ints.assist.value : null,
      rp: ints.rp.ok ? ints.rp.value : null,
      rc: ints.rc.ok ? ints.rc.value : null,
      rig_plus: ints.rig_plus.ok ? ints.rig_plus.value : null,
      rig_minus: ints.rig_minus.ok ? ints.rig_minus.value : null,
      amm: ints.amm.ok ? ints.amm.value : null,
      esp: ints.esp.ok ? ints.esp.value : null,
      autogol: ints.autogol.ok ? ints.autogol.value : null,
    });
  }

  return { rows, season };
}

const TARGETS: { nSquadre: number; file: string; leagueName: string }[] = [
  { nSquadre: 8, file: "asta_1000_lega8.json", leagueName: "Lega di default (8 squadre)" },
  { nSquadre: 10, file: "asta_1000_lega10.json", leagueName: "Lega di default (10 squadre)" },
];

function main(): void {
  const docsDir = resolveDocsDir();
  const sampleDir = path.join(docsDir, "sample");

  const { players, quotations, quotationSeason } = loadPool(docsDir);
  const { rows: stats, season: statsSeason } = loadStats(docsDir, players);
  console.log(
    `pool: ${players.length} giocatori (quotazioni ${quotationSeason}), ${stats.length} righe statistiche (${statsSeason})`,
  );

  for (const { nSquadre, file, leagueName } of TARGETS) {
    const envelope = generateDefaultValuations({
      players,
      quotations,
      stats,
      rules,
      nSquadre,
      leagueName,
      generatedAt: GENERATED_AT,
    });
    const outPath = path.join(sampleDir, file);
    fs.writeFileSync(outPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf-8");

    const perRole = ROLES.map((role) => {
      const inRole = envelope.players.filter((p) => p.ruolo === role);
      const sum = inRole.reduce((s, p) => s + p.fair_value, 0);
      return `${role} ${inRole.length}/Σfv ${sum}`;
    }).join("  ");
    console.log(`${file}: ${envelope.players.length} righe  [${perRole}]`);
  }
}

main();
