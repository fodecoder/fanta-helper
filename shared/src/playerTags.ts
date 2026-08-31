import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import { ROLES } from "./roles";
import { isSamePlayer } from "./matchPlayer";
import type { ProbableLineupEntry } from "./probableLineup";
import type { SetPieceTakerEntry } from "./setPieceTaker";
import { percentileByGroup, teamDefenseRateByTeam, type PlayerRecommendation } from "./recommendationEngine";

// Rank massimo (1 = primo tiratore) entro cui un rigorista è considerato
// affidabile: rank 1 o 2, non il terzo/quarto nome in lista.
const PENALTY_TAKER_MAX_RANK = 2;

// Soglie di "Titolare da 6": affidabilità già alta secondo il motore
// consigli (probable_lineup pesa titolare 0.9, vedi LINEUP_STATO_RELIABILITY
// in recommendationEngine.ts) e fascia "Utile" — né top-performer né fascia
// bassa, il centro della distribuzione di score entro ruolo.
const RELIABILITY_HIGH_THRESHOLD = 0.75;
const TITOLARE_DA_6_TIER = "Utile";

// Percentile (entro ruolo) del tasso (gol+assist)/presenza oltre cui un
// giocatore è "da bonus": top 15% del ruolo.
const BONUS_RATE_TOP_PERCENTILE = 0.85;

// Sotto questa soglia di gol subiti/partita una difesa di squadra è
// "solida" — stessa baseline "difesa nella media" (1.3) di
// GK_BASELINE_GS_PER_MATCH in recommendationEngine.ts, con un margine sotto
// per non taggare ogni difesa appena nella media.
const SOLID_DEFENSE_GS_PER_MATCH = 1.0;

// "Scommessa": FVM nel 35% più economico del ruolo...
const LOW_PRICE_PERCENTILE = 0.35;
// ...più un segnale di upside: mv alto su un campione di presenze piccolo...
const UPSIDE_MV_THRESHOLD = 6.2;
const SMALL_SAMPLE_MATCHES = 10;
// ...oppure titolare oggi con poche presenze storiche (stesso limite sopra).

// "Trappola": inverso di "occasione" — il mercato lo prezza in alto ma il
// motore no, quindi probabile che un avversario ci spenda sopra. FVM nel
// quartile più caro del ruolo...
const TRAP_FVM_HIGH_PERCENTILE = 0.75;
// ...mentre fair_value resta nella metà bassa/media del ruolo...
const TRAP_FAIR_VALUE_LOW_MID_PERCENTILE = 0.5;
// ...con uno scarto minimo tra i due percentili, così da escludere i mismatch
// marginali (stesso ordine di grandezza della soglia 0.25 del badge "Occasione"
// in RecommendationsPage).
const TRAP_PERCENTILE_GAP = 0.3;

// "Da prendere a 1": FVM al minimo...
const MIN_FVM_THRESHOLD = 1;
// ...score praticamente al livello del rimpiazzo (score = scarcityAdjustedValue
// - replacementValue nel motore consigli, quindi vicino a zero in entrambe
// le direzioni)...
const NEAR_REPLACEMENT_EPSILON = 0.5;
// ...e "Io" ha ancora lo slot per quel ruolo.

export type PlayerTagId =
  | "rigorista"
  | "titolare-da-6"
  | "porta-bonus"
  | "difensore-da-bonus"
  | "scommessa"
  | "da-prendere-a-1"
  | "trappola";

export interface PlayerTag {
  id: PlayerTagId;
  label: string;
}

const TAG_LABEL: Record<PlayerTagId, string> = {
  rigorista: "Rigorista",
  "titolare-da-6": "Titolare da 6",
  "porta-bonus": "Porta bonus",
  "difensore-da-bonus": "Difensore da bonus",
  scommessa: "Scommessa",
  "da-prendere-a-1": "Da prendere a 1",
  trappola: "Trappola",
};

function tag(id: PlayerTagId): PlayerTag {
  return { id, label: TAG_LABEL[id] };
}

export interface PlayerTagsInput {
  // Intero pool (non solo i disponibili): serve a teamDefenseRateByTeam per
  // calcolare il tasso difensivo di squadra sull'intero roster, un fatto
  // sulla squadra indipendente da chi è già stato acquistato.
  players: Player[];
  stats: PlayerSeasonStatsRow[];
  quotations: QuotationRow[];
  setPieceTaker: SetPieceTakerEntry[];
  probableLineup: ProbableLineupEntry[];
  rules: LeagueRulesConfig;
  // Output già calcolato da computePlayerRecommendations per la stessa
  // lega/stagione: evita di ricalcolare reliability/score/tier qui.
  recommendations: PlayerRecommendation[];
  // fair_value per giocatore (coalescato con l'override utente), base 1000.
  // Assente per un ruolo = tag "trappola" non calcolabile lì.
  fairValueByPlayerId?: Map<number, number>;
}

export interface PlayerRecommendationWithTags extends PlayerRecommendation {
  tags: PlayerTag[];
}

/**
 * Deriva i tag applicabili a ciascun giocatore disponibile, a partire da
 * pool + stats + quotazioni + set_piece_taker + probable_lineup + regole
 * lega, più l'output già calcolato del motore consigli. Nessuno stato
 * mutabile: tutto ricalcolato a ogni chiamata, stesso spirito di
 * computePlayerRecommendations. Un giocatore può avere più tag.
 */
export function computePlayerTags(input: PlayerTagsInput): Map<number, PlayerTag[]> {
  const { players, stats, quotations, setPieceTaker, probableLineup, rules, recommendations } = input;

  const statsByPlayer = new Map(stats.map((s) => [s.player_id, s]));
  const quotationByPlayer = new Map(quotations.map((q) => [q.player_id, q]));
  const teamDefenseRate = teamDefenseRateByTeam(players, statsByPlayer);

  const bonusRatePercentileByPlayer = bonusRatePercentiles(recommendations, statsByPlayer);
  const trapPercentileByPlayer = trapPercentiles(
    recommendations,
    quotationByPlayer,
    input.fairValueByPlayerId ?? new Map(),
  );

  const result = new Map<number, PlayerTag[]>();

  for (const recommendation of recommendations) {
    const player: Pick<Player, "name" | "team"> = {
      name: recommendation.name,
      team: recommendation.team,
    };
    const stat = statsByPlayer.get(recommendation.player_id);
    const quotation = quotationByPlayer.get(recommendation.player_id);
    const lineupStato = probableLineup.find((row) =>
      isSamePlayer(player, { name: row.player_name, team: row.team }),
    )?.stato;
    const isPenaltyTaker = setPieceTaker.some(
      (row) =>
        row.tipo === "rigore" &&
        row.rank <= PENALTY_TAKER_MAX_RANK &&
        isSamePlayer(player, { name: row.player_name, team: row.team }),
    );

    const tags: PlayerTag[] = [];

    if (isPenaltyTaker) {
      tags.push(tag("rigorista"));
    }

    if (
      lineupStato === "titolare" &&
      recommendation.components.reliability >= RELIABILITY_HIGH_THRESHOLD &&
      recommendation.tier === TITOLARE_DA_6_TIER
    ) {
      tags.push(tag("titolare-da-6"));
    }

    const bonusRatePercentile = bonusRatePercentileByPlayer.get(recommendation.player_id) ?? null;
    const hasTopBonusRate = bonusRatePercentile !== null && bonusRatePercentile >= BONUS_RATE_TOP_PERCENTILE;

    if (hasTopBonusRate) {
      tags.push(tag("porta-bonus"));
    }

    if (recommendation.ruolo === "D") {
      // Il tasso difensivo di squadra vale come segnale di bonus solo se la
      // lega premia la difesa solida (modificatori.difesa.enabled) — senza
      // quel modificatore il bonus non esiste nello scoring di questa lega.
      const teamGsPerMatch = teamDefenseRate.get(recommendation.team) ?? null;
      const hasSolidDefense =
        rules.modificatori.difesa.enabled &&
        teamGsPerMatch !== null &&
        teamGsPerMatch <= SOLID_DEFENSE_GS_PER_MATCH;
      if (hasTopBonusRate || hasSolidDefense) {
        tags.push(tag("difensore-da-bonus"));
      }
    }

    const pricePercentile = recommendation.price.pricePercentile;
    const hasLowPrice = pricePercentile !== null && pricePercentile <= LOW_PRICE_PERCENTILE;
    if (hasLowPrice) {
      const presenze = stat?.presenze ?? 0;
      const smallSample = presenze < SMALL_SAMPLE_MATCHES;
      const highMvOnSmallSample = smallSample && stat !== undefined && (stat.mv ?? 0) >= UPSIDE_MV_THRESHOLD;
      const titolareWithLittleHistory = lineupStato === "titolare" && smallSample;
      if (highMvOnSmallSample || titolareWithLittleHistory) {
        tags.push(tag("scommessa"));
      }
    }

    if (
      quotation?.fvm !== null &&
      quotation?.fvm !== undefined &&
      quotation.fvm <= MIN_FVM_THRESHOLD &&
      Math.abs(recommendation.score) <= NEAR_REPLACEMENT_EPSILON &&
      recommendation.components.ioNeedsRole
    ) {
      tags.push(tag("da-prendere-a-1"));
    }

    const trapPct = trapPercentileByPlayer.get(recommendation.player_id);
    if (
      trapPct !== undefined &&
      trapPct.fvmPct >= TRAP_FVM_HIGH_PERCENTILE &&
      trapPct.fairPct <= TRAP_FAIR_VALUE_LOW_MID_PERCENTILE &&
      trapPct.fvmPct - trapPct.fairPct >= TRAP_PERCENTILE_GAP
    ) {
      tags.push(tag("trappola"));
    }

    result.set(recommendation.player_id, tags);
  }

  return result;
}

// Percentile (entro ruolo) del tasso (gol+assist)/presenza, usato da "Porta
// bonus" e "Difensore da bonus". Gira sui soli giocatori con presenze > 0:
// nessun tasso stimato per chi non ha ancora giocato.
function bonusRatePercentiles(
  recommendations: PlayerRecommendation[],
  statsByPlayer: Map<number, PlayerSeasonStatsRow>,
): Map<number, number> {
  const result = new Map<number, number>();

  for (const role of ROLES) {
    const entries = recommendations
      .filter((r) => r.ruolo === role)
      .map((r) => {
        const stat = statsByPlayer.get(r.player_id);
        const presenze = stat?.presenze ?? 0;
        if (!stat || presenze <= 0) return null;
        const rate = ((stat.gf ?? 0) + (stat.assist ?? 0)) / presenze;
        return { id: r.player_id, value: rate };
      })
      .filter((e): e is { id: number; value: number } => e !== null);

    if (entries.length === 0) continue;

    for (const [id, pct] of percentileByGroup(entries)) {
      result.set(id, pct);
    }
  }

  return result;
}

// Percentili (entro ruolo) di FVM di mercato e fair_value del motore, usati dal
// tag "trappola". Girano sui soli giocatori del ruolo che hanno ENTRAMBI i
// valori: senza uno dei due il mismatch non è definibile. Stessa struttura del
// blocco prezzo in recommendationEngine.ts (percentileByGroup per ruolo).
function trapPercentiles(
  recommendations: PlayerRecommendation[],
  quotationByPlayer: Map<number, QuotationRow>,
  fairValueByPlayerId: Map<number, number>,
): Map<number, { fvmPct: number; fairPct: number }> {
  const result = new Map<number, { fvmPct: number; fairPct: number }>();

  for (const role of ROLES) {
    const entries = recommendations
      .filter((r) => r.ruolo === role)
      .map((r) => {
        const fvm = quotationByPlayer.get(r.player_id)?.fvm;
        const fairValue = fairValueByPlayerId.get(r.player_id);
        if (fvm === null || fvm === undefined || fairValue === undefined) return null;
        return { id: r.player_id, fvm, fairValue };
      })
      .filter((e): e is { id: number; fvm: number; fairValue: number } => e !== null);

    if (entries.length === 0) continue;

    const fvmPct = percentileByGroup(entries.map((e) => ({ id: e.id, value: e.fvm })));
    const fairPct = percentileByGroup(entries.map((e) => ({ id: e.id, value: e.fairValue })));
    for (const e of entries) {
      result.set(e.id, { fvmPct: fvmPct.get(e.id) ?? 0, fairPct: fairPct.get(e.id) ?? 0 });
    }
  }

  return result;
}

/**
 * Unione additiva del flag "trappola" manuale per lega sopra i tag derivati:
 * aggiunge il tag ai giocatori marcati che non l'hanno già dal modello, senza
 * mai rimuovere o sostituire un tag derivato. Il flag manuale è solo di
 * visualizzazione, non tocca `fair_value`.
 */
export function mergeManualTrapTags<T extends { player_id: number; tags: PlayerTag[] }>(
  withTags: T[],
  manualTrapPlayerIds: Iterable<number>,
): T[] {
  const manual = new Set(manualTrapPlayerIds);
  return withTags.map((row) => {
    if (!manual.has(row.player_id) || row.tags.some((t) => t.id === "trappola")) {
      return row;
    }
    return { ...row, tags: [...row.tags, tag("trappola")] };
  });
}
