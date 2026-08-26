import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import type { ManagerAuctionStatus } from "./purchase";
import { ROLES, type Role } from "./roles";

// Bound sulla scarcity multiplier per evitare valori estremi quando
// domanda/offerta sono agli antipodi (es. un ruolo quasi esaurito con un
// solo disponibile). Costante di stabilità numerica, non un peso di lega —
// stesso spirito di MIN_SLOT_RESERVE in maxBid.ts.
const SCARCITY_MIN = 0.85;
const SCARCITY_MAX = 1.35;

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
  { min: 0, label: "Scommessa" },
];

export interface PlayerRecommendationComponents {
  reliability: number;
  leagueAdjustedFm: number | null;
  rawValue: number;
  scarcityMultiplier: number;
  replacementValue: number;
  ioNeedsRole: boolean;
  dataMissing: boolean;
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
  team: string;
  image_url: string | null;
  score: number;
  tier: string;
  components: PlayerRecommendationComponents;
  price: PlayerRecommendationPrice;
}

export interface RecommendationEngineInput {
  rules: LeagueRulesConfig;
  nSquadre: number;
  players: Player[];
  quotations: QuotationRow[];
  stats: PlayerSeasonStatsRow[];
  purchasedPlayerIds: ReadonlySet<number>;
  ioStatus: ManagerAuctionStatus;
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
function teamDefenseRateByTeam(
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

// Percentile all'interno di un gruppo: 1 = valore più alto del gruppo, 0 =
// più basso. Un solo elemento -> percentile 1 (nessuna base di confronto,
// non va penalizzato).
function percentileByGroup(entries: { id: number; value: number }[]): Map<number, number> {
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
  const { rules, nSquadre, players, quotations, stats, purchasedPlayerIds, ioStatus } = input;

  const statsByPlayer = new Map(stats.map((s) => [s.player_id, s]));
  const quotationByPlayer = new Map(quotations.map((q) => [q.player_id, q]));
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
  const scarcityMultiplierByRole = new Map<Role, number>(
    ROLES.map((r): [Role, number] => {
      const remainingDemand = Math.max(
        0,
        nSquadre * rules.rosterConfig[r] - (purchasedCountByRole.get(r) ?? 0),
      );
      const supply = Math.max(supplyByRole.get(r) ?? 0, 1);
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
      };
    }

    const reliability = clamp(stat.presenze / seasonMatchdaysElapsed, 0, 1);
    const bonus = perMatchBonus(stat, rules.scoring, player.ruolo);
    const blendedMv = blendDifesaMv(stat.mv, teamDefenseRate.get(player.team) ?? null);
    const dBonus = difesaBonus(blendedMv, player.ruolo, rules.modificatori);
    const pBonus = player.ruolo === "P" ? portiereBonus(stat, rules.modificatori) : 0;
    const leagueAdjustedFm = stat.mv + bonus + dBonus + pBonus;
    const rawValue = leagueAdjustedFm * reliability;

    return {
      player,
      scarcityAdjustedValue: rawValue * scarcityMultiplier,
      scarcityMultiplier,
      rawValue,
      leagueAdjustedFm,
      reliability,
      dataMissing: false,
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
      scoreById.set(entry.player.id, entry.scarcityAdjustedValue - replacementValue);
      replacementValueById.set(entry.player.id, replacementValue);
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
