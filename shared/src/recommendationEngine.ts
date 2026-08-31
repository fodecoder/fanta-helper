import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import type { ManagerAuctionStatus } from "./purchase";
import { ROLES, type Role } from "./roles";
import { normalizeForMatch } from "./matchPlayer";
import type { ProbableLineupEntry, ProbableLineupStato } from "./probableLineup";

// Bound sulla scarcity multiplier per evitare valori estremi quando
// domanda/offerta sono agli antipodi (es. un ruolo quasi esaurito con un
// solo disponibile). Costante di stabilità numerica, non un peso di lega —
// stesso spirito di MIN_SLOT_RESERVE in maxBid.ts.
const SCARCITY_MIN = 0.85;
const SCARCITY_MAX = 1.35;

// Voto di sufficienza: il contributo di mv allo score è il margine sopra
// questa soglia, non il voto assoluto — così i bonus (bomber, rigorista,
// ecc.) pesano a pieno invece di essere appiattiti dalla componente mv, che
// altrimenti domina in valore assoluto (mv~6 vs bonus~0.1-0.9). Concetto
// distinto da TEAM_DEFENSE_BASELINE_MV più sotto, pur condividendo lo stesso
// valore numerico: quella è una baseline di gol subiti di squadra convertita
// in mv equivalente, questa è la soglia di sufficienza del voto individuale.
const MV_BASELINE = 6.0;

// Pesi di reliability da probable_lineup.stato: un titolare odierno non va
// penalizzato dalle sole presenze storiche (neopromossi, nuovi acquisti
// senza storico nella stagione importata). reliability prende il massimo
// tra presenzeRatio e questo peso, mai il minimo: uno storico solido non
// viene mai declassato da uno stato di formazione probabile.
const LINEUP_STATO_RELIABILITY: Record<ProbableLineupStato, number> = {
  titolare: 0.9,
  ballottaggio: 0.6,
  panchina: 0.3,
};

// Baseline di gol subiti/partita di una difesa "nella media", condivisa tra
// il bonus portiere (individuale) e il blend difesa (di squadra): stesso
// segnale letto a due livelli diversi. Costante documentata, non derivata
// dalle regole lega (non esiste un concetto di "difesa nella media" nel
// regolamento da cui ricavarla).
const GK_BASELINE_GS_PER_MATCH = 1.3;
// Punti di bonus atteso per ogni gol/partita risparmiato sotto la baseline.
// Solo additivo: il malus per gol subiti è già scontato da
// scoring.gol_subito dentro perMatchBonus, qui si premia solo l'upside da
// clean-sheet quando il portiere è sopra la media.
const GK_BONUS_PER_SAVED_GOAL = 2;
const GK_BONUS_MAX = 3;

// Conversione tasso gol-subiti di squadra -> "mv equivalente", per fondersi
// con l'mv individuale nel lookup di difesaBonus. Ancorata a costanti fisse
// (non a min/max del pool importato) così il bonus di un giocatore non
// dipende da chi altro è nel dataset in quel momento.
const TEAM_DEFENSE_BASELINE_GS_PER_MATCH = GK_BASELINE_GS_PER_MATCH;
const TEAM_DEFENSE_BASELINE_MV = 6;
const TEAM_DEFENSE_MV_PER_GOAL = 1;
const DIFESA_PLAYER_MV_WEIGHT = 0.7;
const DIFESA_TEAM_MV_WEIGHT = 0.3;

// Soglie di percentile per il bucket di fascia, entro ruolo. Costanti
// documentate, non derivate dalla lega (non esiste un concetto di "fascia"
// nelle regole lega da cui ricavarle).
const TIER_THRESHOLDS: { min: number; label: string }[] = [
  { min: 0.9, label: "Top" },
  { min: 0.65, label: "Solido" },
  { min: 0.35, label: "Utile" },
  { min: 0, label: "Basso" },
];

// Scomposizione passo-passo dello score, di sola diagnosi/UI: espone i termini
// intermedi (oggi locali) che portano da mv grezzo a Punteggio, con i valori
// realmente usati. `null` quando i dati stagione mancano (score forzato a 0).
export interface ScoreBreakdown {
  mv: number;
  mvBaseline: number;
  perMatchBonus: number;
  difesaBonus: number;
  portiereBonus: number;
  blendedMv: number;
  leagueAdjustedFm: number;
  presenzeRatio: number;
  lineupStato: ProbableLineupStato | null;
  reliability: number;
  seasonMatchdaysElapsed: number;
  rawValue: number;
  scarcityMultiplier: number;
  scarcityRemainingDemand: number;
  scarcitySupply: number;
  scarcityAdjustedValue: number;
  replacementRank: number;
  replacementValue: number;
  score: number;
}

export interface PlayerRecommendationComponents {
  reliability: number;
  leagueAdjustedFm: number | null;
  rawValue: number;
  scarcityMultiplier: number;
  replacementValue: number;
  ioNeedsRole: boolean;
  dataMissing: boolean;
  breakdown: ScoreBreakdown | null;
}

export interface PlayerRecommendationPrice {
  qt_i: number | null;
  qt_a: number | null;
  fvm: number | null;
  valuePercentile: number | null;
  pricePercentile: number | null;
  gapSignal: number | null;
}

export interface PlayerRecommendation {
  player_id: number;
  ruolo: Role;
  name: string;
  nome_completo: string | null;
  team: string;
  image_url: string | null;
  score: number;
  tier: string;
  components: PlayerRecommendationComponents;
  price: PlayerRecommendationPrice;
  // Annotato a valle da applyTeamPreferences (layer per-utente): non influenza
  // score/tier, solo badge in UI e ordinamento secondario entro fascia.
  teamPref?: "prefer" | "avoid" | null;
}

export interface RecommendationEngineInput {
  rules: LeagueRulesConfig;
  nSquadre: number;
  players: Player[];
  quotations: QuotationRow[];
  stats: PlayerSeasonStatsRow[];
  purchasedPlayerIds: ReadonlySet<number>;
  ioStatus: ManagerAuctionStatus;
  probableLineup: ProbableLineupEntry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Bonus/malus grezzi della stagione pesati con lo scoring della lega, per
// presenza. `gs` (gol subiti) conta solo per i portieri: è l'unica voce di
// scoring specifica del ruolo.
function perMatchBonus(
  stat: PlayerSeasonStatsRow,
  scoring: LeagueRulesConfig["scoring"],
  ruolo: Role,
): number {
  const presenze = stat.presenze ?? 0;
  if (presenze <= 0) return 0;

  const total =
    (stat.gf ?? 0) * scoring.gol +
    (stat.assist ?? 0) * scoring.assist +
    (stat.rig_plus ?? 0) * scoring.rigore_segnato +
    (stat.rig_minus ?? 0) * scoring.rigore_sbagliato +
    (stat.rp ?? 0) * scoring.rigore_parato +
    (stat.amm ?? 0) * scoring.ammonizione +
    (stat.esp ?? 0) * scoring.espulsione +
    (stat.autogol ?? 0) * scoring.autorete +
    (ruolo === "P" ? (stat.gs ?? 0) * scoring.gol_subito : 0);

  return total / presenze;
}

// Bonus atteso portiere: stima la propensione al clean-sheet dal proprio
// gs/presenze. È un proxy individuale (il dato di dettaglio per giornata a
// livello di reparto non è disponibile), non una media di reparto — la
// confidenza è quella di un singolo portiere, non del gruppo difensivo.
function portiereBonus(stat: PlayerSeasonStatsRow, modificatori: LeagueRulesConfig["modificatori"]): number {
  if (!modificatori.portiere.enabled) return 0;
  const presenze = stat.presenze ?? 0;
  if (presenze <= 0 || stat.gs === null) return 0;

  const gsPerMatch = stat.gs / presenze;
  return clamp((GK_BASELINE_GS_PER_MATCH - gsPerMatch) * GK_BONUS_PER_SAVED_GOAL, 0, GK_BONUS_MAX);
}

// Tasso di gol subiti a partita per squadra, aggregato sui portieri (unica
// fonte con `gs` significativo, vedi perMatchBonus). Squadre senza portieri
// con dati validi restano fuori dalla mappa: nessun dato viene inventato, i
// chiamanti degradano al comportamento basato sul solo mv individuale.
export function teamDefenseRateByTeam(
  players: Player[],
  statsByPlayer: Map<number, PlayerSeasonStatsRow>,
): Map<string, number> {
  const agg = new Map<string, { gs: number; presenze: number }>();
  for (const p of players) {
    if (p.ruolo !== "P") continue;
    const stat = statsByPlayer.get(p.id);
    if (!stat || stat.presenze === null || stat.presenze <= 0 || stat.gs === null) continue;

    const entry = agg.get(p.team) ?? { gs: 0, presenze: 0 };
    entry.gs += stat.gs;
    entry.presenze += stat.presenze;
    agg.set(p.team, entry);
  }

  const rateByTeam = new Map<string, number>();
  for (const [team, { gs, presenze }] of agg) {
    rateByTeam.set(team, gs / presenze);
  }
  return rateByTeam;
}

// Fonde l'mv individuale con la solidità difensiva di squadra, per il
// lookup in difesaBonus. Senza un tasso di squadra disponibile degrada al
// comportamento attuale (solo mv), senza stimare nulla.
function blendDifesaMv(mv: number, teamGsPerMatch: number | null): number {
  if (teamGsPerMatch === null) return mv;

  const teamEquivalentMv =
    TEAM_DEFENSE_BASELINE_MV + (TEAM_DEFENSE_BASELINE_GS_PER_MATCH - teamGsPerMatch) * TEAM_DEFENSE_MV_PER_GOAL;
  return DIFESA_PLAYER_MV_WEIGHT * mv + DIFESA_TEAM_MV_WEIGHT * teamEquivalentMv;
}

// Bonus difesa: applica il bonus della banda più alta il cui `media` è
// raggiunta o superata dal valore mv passato (già fuso con la solidità
// difensiva di squadra da blendDifesaMv, vedi il chiamante).
function difesaBonus(mv: number, ruolo: Role, modificatori: LeagueRulesConfig["modificatori"]): number {
  if (!modificatori.difesa.enabled) return 0;
  if (ruolo !== "P" && ruolo !== "D") return 0;

  let bonus = 0;
  for (const band of modificatori.difesa.tabella) {
    if (mv >= band.media && band.bonus > bonus) bonus = band.bonus;
  }
  return bonus;
}

// Chiave di join giocatore<->probable_lineup: stesso criterio di
// isSamePlayer/normalizeForMatch (nome+team normalizzati, match esplicito e
// conservativo, niente fuzzy), ma precalcolata in una mappa invece che con
// un .find per giocatore — qui gira su ogni giocatore disponibile, non su
// una singola selezione come lineupStatusFor in auctionDerivations.ts.
function matchKey(name: string, team: string): string {
  return `${normalizeForMatch(name)}|${normalizeForMatch(team)}`;
}

function lineupStatoByKey(rows: ProbableLineupEntry[]): Map<string, ProbableLineupStato> {
  const map = new Map<string, ProbableLineupStato>();
  for (const row of rows) {
    map.set(matchKey(row.player_name, row.team), row.stato);
  }
  return map;
}

// Percentile all'interno di un gruppo: 1 = valore più alto del gruppo, 0 =
// più basso. Un solo elemento -> percentile 1 (nessuna base di confronto,
// non va penalizzato).
export function percentileByGroup(entries: { id: number; value: number }[]): Map<number, number> {
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const ranks = new Map<number, number>();
  const n = sorted.length;
  sorted.forEach((entry, i) => {
    ranks.set(entry.id, n <= 1 ? 1 : i / (n - 1));
  });
  return ranks;
}

function tierFor(percentile: number): string {
  for (const bucket of TIER_THRESHOLDS) {
    if (percentile >= bucket.min) return bucket.label;
  }
  return TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]!.label;
}

interface ScoredEntry {
  player: Player;
  scarcityAdjustedValue: number;
  scarcityMultiplier: number;
  rawValue: number;
  leagueAdjustedFm: number | null;
  reliability: number;
  dataMissing: boolean;
  // Popolata nella closure per i giocatori con dati; i campi che dipendono dal
  // rank di ruolo (replacementRank/Value, score) sono riempiti nel loop VORP.
  breakdown: ScoreBreakdown | null;
}

// Percentile per ruolo dello score, riscalato su 0–10 (1 decimale): 0 = ultimo
// del pool di ruolo, 10 = primo. SOLO presentazione — non tocca `score`, che
// resta la fonte di verità per ordinamento/fasce/VORP. Per-ruolo perché gli
// score VORP non sono comparabili tra ruoli. Riusa `percentileByGroup`.
export function normalizeScoresByRole(
  recs: { player_id: number; ruolo: Role; score: number }[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const role of ROLES) {
    const inRole = recs.filter((r) => r.ruolo === role);
    if (inRole.length === 0) continue;
    const percentiles = percentileByGroup(inRole.map((r) => ({ id: r.player_id, value: r.score })));
    for (const [id, p] of percentiles) {
      out.set(id, Math.round(p * 100) / 10);
    }
  }
  return out;
}

/**
 * Motore puro e deterministico: ordina i giocatori disponibili per valore
 * RELATIVO alla lega (scoring/modificatori, scarsità di reparto, bisogni
 * residui di "Io"). Nessuno stato mutabile: tutto è ricalcolato da pool +
 * quotazioni/statistiche dell'ultima stagione disponibile + log `purchase` +
 * regole lega, già filtrati/derivati dal chiamante.
 */
export function computePlayerRecommendations(
  input: RecommendationEngineInput,
): PlayerRecommendation[] {
  const { rules, nSquadre, players, quotations, stats, purchasedPlayerIds, ioStatus, probableLineup } =
    input;

  const statsByPlayer = new Map(stats.map((s) => [s.player_id, s]));
  const quotationByPlayer = new Map(quotations.map((q) => [q.player_id, q]));
  const lineupStatoByPlayer = lineupStatoByKey(probableLineup);
  const available = players.filter((p) => !purchasedPlayerIds.has(p.id));

  // Calcolato sull'intero roster (non solo `available`): è un fatto sulla
  // squadra nella stagione, indipendente da chi è già stato acquistato.
  const teamDefenseRate = teamDefenseRateByTeam(players, statsByPlayer);

  // Massimo di presenze osservato nella stagione tra tutti i giocatori con
  // dati: proxy delle giornate finora disputate, si adatta sia a stagioni
  // storiche complete sia alla stagione corrente a metà campionato.
  const seasonMatchdaysElapsed = Math.max(1, ...stats.map((s) => s.presenze ?? 0));

  const ioFreeSlots = new Map<Role, number>(
    ioStatus.slots.map((s): [Role, number] => [s.ruolo, Math.max(s.free, 0)]),
  );

  // Domanda residua di reparto = slot totali di lega meno quelli già
  // occupati da qualunque manager; offerta = disponibili per ruolo.
  const purchasedCountByRole = new Map<Role, number>(ROLES.map((r): [Role, number] => [r, 0]));
  for (const player of players) {
    if (purchasedPlayerIds.has(player.id)) {
      purchasedCountByRole.set(player.ruolo, (purchasedCountByRole.get(player.ruolo) ?? 0) + 1);
    }
  }
  const supplyByRole = new Map<Role, number>(ROLES.map((r): [Role, number] => [r, 0]));
  for (const player of available) {
    supplyByRole.set(player.ruolo, (supplyByRole.get(player.ruolo) ?? 0) + 1);
  }
  const scarcityDetailByRole = new Map<Role, { remainingDemand: number; supply: number }>(
    ROLES.map((r): [Role, { remainingDemand: number; supply: number }] => {
      const remainingDemand = Math.max(
        0,
        nSquadre * rules.rosterConfig[r] - (purchasedCountByRole.get(r) ?? 0),
      );
      const supply = Math.max(supplyByRole.get(r) ?? 0, 1);
      return [r, { remainingDemand, supply }];
    }),
  );
  const scarcityMultiplierByRole = new Map<Role, number>(
    ROLES.map((r): [Role, number] => {
      const { remainingDemand, supply } = scarcityDetailByRole.get(r)!;
      return [r, clamp(remainingDemand / supply, SCARCITY_MIN, SCARCITY_MAX)];
    }),
  );

  const scored: ScoredEntry[] = available.map((player) => {
    const stat = statsByPlayer.get(player.id);
    const scarcityMultiplier = scarcityMultiplierByRole.get(player.ruolo) ?? 1;

    if (!stat || stat.mv === null || stat.presenze === null) {
      return {
        player,
        scarcityAdjustedValue: 0,
        scarcityMultiplier,
        rawValue: 0,
        leagueAdjustedFm: null,
        reliability: 0,
        dataMissing: true,
        breakdown: null,
      };
    }

    const presenzeRatio = clamp(stat.presenze / seasonMatchdaysElapsed, 0, 1);
    const stato = lineupStatoByPlayer.get(matchKey(player.name, player.team));
    const reliability =
      stato !== undefined ? Math.max(presenzeRatio, LINEUP_STATO_RELIABILITY[stato]) : presenzeRatio;
    const bonus = perMatchBonus(stat, rules.scoring, player.ruolo);
    const blendedMv = blendDifesaMv(stat.mv, teamDefenseRate.get(player.team) ?? null);
    const dBonus = difesaBonus(blendedMv, player.ruolo, rules.modificatori);
    const pBonus = player.ruolo === "P" ? portiereBonus(stat, rules.modificatori) : 0;
    const leagueAdjustedFm = stat.mv - MV_BASELINE + bonus + dBonus + pBonus;
    // Floor solo qui, non sul componente esposto: se leagueAdjustedFm è
    // negativo (mv sotto sufficienza), moltiplicarlo per reliability<1 lo
    // renderebbe meno negativo, premiando un giocatore inaffidabile rispetto
    // a uno affidabile con lo stesso mv scarso. leagueAdjustedFm resta
    // trasparente (può restare negativo) per diagnosi/UI.
    const rawValue = Math.max(leagueAdjustedFm, 0) * reliability;
    const scarcityAdjustedValue = rawValue * scarcityMultiplier;
    const scarcityDetail = scarcityDetailByRole.get(player.ruolo) ?? {
      remainingDemand: 0,
      supply: 1,
    };

    return {
      player,
      scarcityAdjustedValue,
      scarcityMultiplier,
      rawValue,
      leagueAdjustedFm,
      reliability,
      dataMissing: false,
      breakdown: {
        mv: stat.mv,
        mvBaseline: MV_BASELINE,
        perMatchBonus: bonus,
        difesaBonus: dBonus,
        portiereBonus: pBonus,
        blendedMv,
        leagueAdjustedFm,
        presenzeRatio,
        lineupStato: stato ?? null,
        reliability,
        seasonMatchdaysElapsed,
        rawValue,
        scarcityMultiplier,
        scarcityRemainingDemand: scarcityDetail.remainingDemand,
        scarcitySupply: scarcityDetail.supply,
        scarcityAdjustedValue,
        // Riempiti nel loop VORP sotto.
        replacementRank: 0,
        replacementValue: 0,
        score: 0,
      },
    };
  });

  // VORP: rank per ruolo per scarcityAdjustedValue desc; il rimpiazzo è il
  // marginale che "Io" perderebbe se gli slot liberi che gli restano nel
  // ruolo venissero presi prima di lui.
  const scoreById = new Map<number, number>();
  const replacementValueById = new Map<number, number>();

  for (const role of ROLES) {
    const inRole = scored
      .filter((e) => e.player.ruolo === role)
      .sort((a, b) => b.scarcityAdjustedValue - a.scarcityAdjustedValue);
    if (inRole.length === 0) continue;

    const replacementRank = clamp((ioFreeSlots.get(role) ?? 0) + 1, 1, inRole.length);
    const replacementValue = inRole[replacementRank - 1]!.scarcityAdjustedValue;

    for (const entry of inRole) {
      const score = entry.scarcityAdjustedValue - replacementValue;
      scoreById.set(entry.player.id, score);
      replacementValueById.set(entry.player.id, replacementValue);
      if (entry.breakdown) {
        entry.breakdown.replacementRank = replacementRank;
        entry.breakdown.replacementValue = replacementValue;
        entry.breakdown.score = score;
      }
    }
  }

  // Fasce e segnale prezzo: percentile per ruolo su score e su FVM
  // (più economico = percentile più alto), calcolati separatamente perché
  // la fascia è sul valore assoluto mentre il segnale prezzo confronta due
  // percentili.
  const tierById = new Map<number, string>();
  const pricePercentileById = new Map<number, number>();
  const valuePercentileById = new Map<number, number>();

  for (const role of ROLES) {
    const inRole = scored.filter((e) => e.player.ruolo === role);
    if (inRole.length === 0) continue;

    const scorePercentiles = percentileByGroup(
      inRole.map((e) => ({ id: e.player.id, value: scoreById.get(e.player.id) ?? 0 })),
    );
    for (const [id, pct] of scorePercentiles) {
      tierById.set(id, tierFor(pct));
      valuePercentileById.set(id, pct);
    }

    const withPrice = inRole.filter((e) => {
      const fvm = quotationByPlayer.get(e.player.id)?.fvm;
      return fvm !== undefined && fvm !== null;
    });
    if (withPrice.length > 0) {
      // Percentile di "costosità" su fvm: prezzo più alto -> percentile più
      // alto. Il segnale (sotto) è valuePercentile - pricePercentile: un
      // giocatore con valore alto e prezzo basso ottiene un gap positivo
      // (occasione); valore basso e prezzo alto un gap negativo.
      const pricePercentiles = percentileByGroup(
        withPrice.map((e) => ({
          id: e.player.id,
          value: quotationByPlayer.get(e.player.id)!.fvm ?? 0,
        })),
      );
      for (const [id, pct] of pricePercentiles) {
        pricePercentileById.set(id, pct);
      }
    }
  }

  const results = scored.map((entry) => {
    const quotation = quotationByPlayer.get(entry.player.id);
    const valuePercentile = valuePercentileById.get(entry.player.id) ?? null;
    const pricePercentile = pricePercentileById.get(entry.player.id) ?? null;

    return {
      player_id: entry.player.id,
      ruolo: entry.player.ruolo,
      name: entry.player.name,
      nome_completo: entry.player.nome_completo,
      team: entry.player.team,
      image_url: entry.player.image_url,
      score: scoreById.get(entry.player.id) ?? 0,
      tier: tierById.get(entry.player.id) ?? TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]!.label,
      components: {
        reliability: entry.reliability,
        leagueAdjustedFm: entry.leagueAdjustedFm,
        rawValue: entry.rawValue,
        scarcityMultiplier: entry.scarcityMultiplier,
        replacementValue: replacementValueById.get(entry.player.id) ?? 0,
        ioNeedsRole: (ioFreeSlots.get(entry.player.ruolo) ?? 0) > 0,
        dataMissing: entry.dataMissing,
        breakdown: entry.breakdown,
      },
      price: {
        qt_i: quotation?.qt_i ?? null,
        qt_a: quotation?.qt_a ?? null,
        fvm: quotation?.fvm ?? null,
        valuePercentile,
        pricePercentile,
        gapSignal:
          valuePercentile !== null && pricePercentile !== null
            ? valuePercentile - pricePercentile
            : null,
      },
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
