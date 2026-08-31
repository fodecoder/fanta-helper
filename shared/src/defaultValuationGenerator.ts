import {
  computePlayerRecommendations,
  percentileByGroup,
  type RecommendationEngineInput,
} from "./recommendationEngine";
import { ROLES, type Role } from "./roles";
import type { LeagueRulesConfig } from "./league";
import type { Player } from "./player";
import type { QuotationRow } from "./quotation";
import type { PlayerSeasonStatsRow } from "./playerSeasonStats";
import type { ProbableLineupEntry } from "./probableLineup";
import type { ManagerAuctionStatus } from "./purchase";
import { valuationEntrySchema, type Confidence, type Valuation } from "./valuation";

// I valori generati sono sempre su base 1000 crediti, come i valori importati
// da JSON: le viste li riscalano a lettura per il budget reale della lega
// (vedi valuationScale.ts). Nessun campo di stato mutabile: tutto è derivato
// dal motore di raccomandazione + regole lega a ogni run.
const GENERATOR_BUDGET = 1000;

// Budget di reparto su base 1000 (somma dei quattro = 1000). Due varianti a
// seconda del modificatore difesa: attivo → la difesa vale di più; spento →
// i crediti si spostano su centrocampo e attacco. Numeri concordati con
// l'utente nel piano P13a, dentro i range tradizionali del fantacalcio.
const DEPARTMENT_BUDGET_DIFESA_ON: Record<Role, number> = { P: 65, D: 260, C: 315, A: 360 };
const DEPARTMENT_BUDGET_DIFESA_OFF: Record<Role, number> = { P: 70, D: 190, C: 320, A: 420 };

// La spesa complessiva che un reparto muove nell'asta = budget di reparto
// per-squadra B_R × nSquadre. fair_value di un giocatore = sua quota di quella
// spesa, in proporzione al surplus (valore motore oltre il primo sostituto
// libero). Σ_R fair_value ≈ B_R × nSquadre. È qui che nSquadre entra
// direttamente negli importi (oltre alla scarsità di reparto del motore),
// così i due file lega8/lega10 non sono un riscalaggio lineare l'uno
// dell'altro.
// max_bid di un singolo giocatore non può superare questa quota della spesa
// totale di reparto (un solo top non satura il reparto).
const MAX_BID_DEPARTMENT_SHARE = 0.15;

// panic_price ≈ max_bid × questo fattore. Calibrato sui file sample storici,
// dove panic ≈ 1.1–1.2 × max.
const PANIC_MULT = 1.15;

// Un giocatore senza dati stagione (dataMissing) non ha un surplus motore:
// il suo peso nella distribuzione del budget di reparto deriva dal solo FVM
// di listino, molto attenuato. Euristica di fallback, non un valore motore.
const DATA_MISSING_FVM_WEIGHT = 0.05;

// Backtest fantacalcio.dev (tassi di conferma della fascia pre-asta nella
// stagione successiva: C 62%, D 54%, A/P 33%): sotto questa soglia di
// fantavoti nella stagione di riferimento il campione è troppo rumoroso per
// dare una confidence sopra "low", a prescindere dalla fascia.
const MIN_FANTAVOTI_FOR_CONFIDENCE = 15;

export interface GenerateDefaultValuationsParams {
  players: Player[];
  quotations: QuotationRow[];
  stats: PlayerSeasonStatsRow[];
  rules: LeagueRulesConfig;
  nSquadre: number;
  probableLineup?: ProbableLineupEntry[];
  leagueName?: string;
  // Unico campo non deterministico dell'output: informativo, non consumato
  // dal seed. Passarlo fisso rende il file rigenerabile byte a byte.
  generatedAt?: string;
}

export interface DefaultValuationsEnvelope {
  league_name: string;
  generated_at: string;
  budget: number;
  n_teams: number;
  roster: Record<Role, number> & { tot: number };
  players: Valuation[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Pavimento di 1 credito per ogni riga, poi il residuo di reparto
// (budget − numero giocatori) distribuito in proporzione al peso con
// arrotondamento a resto massimo, così la somma torna esatta al budget.
// Reparto più affollato del budget → tutti restano a 1 (Σ leggermente sopra
// il budget, artefatto accettato).
function allocateFairValues(
  ids: number[],
  weightById: Map<number, number>,
  departmentBudget: number,
): Map<number, number> {
  const result = new Map<number, number>(ids.map((id) => [id, 1]));
  const remaining = departmentBudget - ids.length;
  if (remaining <= 0) return result;

  const totalWeight = ids.reduce((sum, id) => sum + (weightById.get(id) ?? 0), 0);
  const shares = ids.map((id) => {
    const fraction = totalWeight > 0 ? (weightById.get(id) ?? 0) / totalWeight : 1 / ids.length;
    return { id, exact: remaining * fraction };
  });

  let assigned = 0;
  for (const share of shares) {
    const floor = Math.floor(share.exact);
    result.set(share.id, (result.get(share.id) ?? 1) + floor);
    assigned += floor;
  }

  let leftover = remaining - assigned;
  shares.sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || a.id - b.id,
  );
  for (let i = 0; i < shares.length && leftover > 0; i += 1) {
    const id = shares[i]!.id;
    result.set(id, (result.get(id) ?? 1) + 1);
    leftover -= 1;
  }
  return result;
}

// Fascia S/A/B/C/D su percentile del valore motore dentro il ruolo. Il
// centrocampo ha la fascia top più ampia (S da p85 invece di p90): è il
// reparto dove il motore separa meglio i titolari affidabili.
function tierFor(percentile: number, role: Role): string {
  const topThreshold = role === "C" ? 0.85 : 0.9;
  if (percentile >= topThreshold) return "S";
  if (percentile >= 0.7) return "A";
  if (percentile >= 0.45) return "B";
  if (percentile >= 0.2) return "C";
  return "D";
}

function confidenceFor(
  role: Role,
  tier: string,
  fantavoti: number,
  dataMissing: boolean,
): Confidence {
  if (dataMissing || fantavoti < MIN_FANTAVOTI_FOR_CONFIDENCE) return "low";
  const topTier = tier === "S" || tier === "A";
  if (role === "C") {
    if (topTier) return "high";
    return tier === "B" ? "medium" : "low";
  }
  if (role === "D") return topTier ? "medium" : "low";
  // A e P: conferma di fascia storicamente bassa, medium solo sui top assoluti.
  return tier === "S" ? "medium" : "low";
}

/**
 * Genera un listino di valutazioni a copertura totale del pool, deterministico
 * e riproducibile: nessuna chiamata LLM, ogni importo è derivato dal motore di
 * raccomandazione (VORP relativo alla lega e alla scarsità di reparto) più il
 * budget di reparto su base 1000. Ogni giocatore del pool riceve una riga.
 */
export function generateDefaultValuations(
  params: GenerateDefaultValuationsParams,
): DefaultValuationsEnvelope {
  const { players, quotations, stats, rules, nSquadre } = params;
  const probableLineup = params.probableLineup ?? [];
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const leagueName = params.leagueName ?? `Lega di default (${nSquadre} squadre)`;

  const ioStatus: ManagerAuctionStatus = {
    managerId: 1,
    managerName: "Io",
    isOwner: true,
    budget: GENERATOR_BUDGET,
    spent: 0,
    residuo: GENERATOR_BUDGET,
    adjustedMaxBid: GENERATOR_BUDGET,
    slots: ROLES.map((role) => ({
      ruolo: role,
      total: rules.rosterConfig[role],
      used: 0,
      free: rules.rosterConfig[role],
    })),
  };

  const engineInput: RecommendationEngineInput = {
    rules,
    nSquadre,
    players,
    quotations,
    stats,
    purchasedPlayerIds: new Set(),
    ioStatus,
    probableLineup,
  };
  const recs = computePlayerRecommendations(engineInput);

  const departmentBudget = rules.modificatori.difesa.enabled
    ? DEPARTMENT_BUDGET_DIFESA_ON
    : DEPARTMENT_BUDGET_DIFESA_OFF;
  const quotationByPlayer = new Map(quotations.map((q) => [q.player_id, q]));
  const fantavotiByPlayer = new Map(stats.map((s) => [s.player_id, s.presenze ?? 0]));

  const rows: Valuation[] = [];

  for (const role of ROLES) {
    const inRole = recs.filter((rec) => rec.ruolo === role);
    if (inRole.length === 0) continue;

    const budget = departmentBudget[role] * nSquadre;
    const cap = Math.max(1, Math.round(budget * MAX_BID_DEPARTMENT_SHARE));

    const weightById = new Map<number, number>();
    for (const rec of inRole) {
      const fvm = quotationByPlayer.get(rec.player_id)?.fvm ?? 0;
      const weight = rec.components.dataMissing
        ? fvm * DATA_MISSING_FVM_WEIGHT
        : Math.max(0, rec.score);
      weightById.set(rec.player_id, weight);
    }
    const totalWeight = inRole.reduce((sum, rec) => sum + (weightById.get(rec.player_id) ?? 0), 0);
    // Tasso crediti-per-punto-motore del reparto: converte il surplus del
    // motore (VORP, unità di fantamedia) in crediti sulla stessa scala del
    // fair value. È il prezzo che la domanda di reparto mette sul valore.
    const creditRate = totalWeight > 0 ? budget / totalWeight : 0;

    const fairById = allocateFairValues(
      inRole.map((rec) => rec.player_id),
      weightById,
      budget,
    );
    const scorePercentile = percentileByGroup(
      inRole.map((rec) => ({ id: rec.player_id, value: rec.score })),
    );

    const built = inRole.map((rec) => {
      const fairValue = fairById.get(rec.player_id) ?? 1;
      const dataMissing = rec.components.dataMissing;
      const tier = dataMissing
        ? "D"
        : tierFor(scorePercentile.get(rec.player_id) ?? 0, role);
      // max_bid = fair value + quanto perderesti a lasciarlo al rivale =
      // surplus motore oltre il primo sostituto libero, convertito in crediti
      // col tasso di reparto. Cap alla quota di reparto perché un solo top non
      // può saturare il reparto.
      const surplusCredits = dataMissing ? 0 : (weightById.get(rec.player_id) ?? 0) * creditRate;
      const maxBid = clamp(
        Math.round(fairValue + surplusCredits),
        fairValue,
        Math.max(fairValue, cap),
      );
      const entry: Valuation = {
        name: rec.name,
        team: rec.team,
        ruolo: role,
        tier,
        target: fairValue,
        fair_value: fairValue,
        max_bid: maxBid,
        panic_price: Math.round(maxBid * PANIC_MULT),
        confidence: confidenceFor(
          role,
          tier,
          fantavotiByPlayer.get(rec.player_id) ?? 0,
          dataMissing,
        ),
        note: null,
      };
      return { entry, score: rec.score };
    });

    built.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.entry.name < b.entry.name) return -1;
      if (a.entry.name > b.entry.name) return 1;
      return a.entry.team < b.entry.team ? -1 : a.entry.team > b.entry.team ? 1 : 0;
    });

    for (const { entry } of built) {
      rows.push(valuationEntrySchema.parse(entry));
    }
  }

  const { P, D, C, A } = rules.rosterConfig;
  return {
    league_name: leagueName,
    generated_at: generatedAt,
    budget: GENERATOR_BUDGET,
    n_teams: nSquadre,
    roster: { P, D, C, A, tot: P + D + C + A },
    players: rows,
  };
}
