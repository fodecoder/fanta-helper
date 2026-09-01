import type {
  GkPairingEntry,
  ManagerAuctionStatus,
  ManagerRoster,
  Player,
  ProbableLineupEntry,
  ProbableLineupStato,
  Role,
  RoleSlotStatus,
  SetPieceTakerEntry,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import { isSamePlayer } from "@fanta-helper/shared";

// Colori semantici del verdetto/impatto (token del design system).
export const COLOR_MUTED = "var(--color-neutral-700)";
export const COLOR_GOOD = "var(--color-accent-700)";
export const COLOR_WARN = "var(--color-accent-2-700)";
export const COLOR_INK = "var(--color-text)";

export const ROLE_LABEL: Record<Role, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

export function roleColor(ruolo: Role): string {
  return `var(--role-${ruolo.toLowerCase()})`;
}

// Match esplicito e conservativo (niente fuzzy matching): se nome+squadra
// normalizzati non coincidono esattamente, il giocatore resta senza dato,
// mai una stima.
export function lineupStatusFor(
  player: Pick<Player, "name" | "team">,
  rows: ProbableLineupEntry[] | null,
): ProbableLineupStato | null {
  return (
    (rows ?? []).find((r) => isSamePlayer(player, { name: r.player_name, team: r.team }))?.stato ??
    null
  );
}

export function setPieceRanksFor(
  player: Pick<Player, "name" | "team">,
  rows: SetPieceTakerEntry[] | null,
): SetPieceTakerEntry[] {
  return (rows ?? []).filter((r) => isSamePlayer(player, { name: r.player_name, team: r.team }));
}

// `+` (più caro / fair value superiore) in magenta, `−` in ciano — come il log
// e il confronto dei prototipi.
export function deltaColor(delta: number): string {
  return delta > 0 ? COLOR_WARN : COLOR_GOOD;
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

export interface Verdict {
  text: string;
  color: string;
}

// Verdetto puramente derivato dal prezzo digitato e dalla valutazione del
// giocatore in asta. Le soglie salgono: affare → prezzo giusto → sopra il fair
// value → zona panic → fuori mercato.
export function verdict(price: number | null, val: ValuationWithPlayer | undefined): Verdict {
  if (val === undefined || price === null) {
    return { text: "In attesa del prezzo", color: COLOR_MUTED };
  }
  if (price > val.panic_price) return { text: "Fuori mercato", color: COLOR_WARN };
  if (price > val.max_bid) return { text: "Zona panic", color: COLOR_WARN };
  if (price > val.fair_value) return { text: "Sopra il fair value", color: COLOR_INK };
  if (price > val.target) return { text: "Prezzo giusto", color: COLOR_GOOD };
  return { text: "Affare", color: COLOR_GOOD };
}

export type VerdictTone = "good" | "fair" | "over" | "wait";

// Fascia a 3 stati per il badge "verdetto live" del redesign (handoff
// § Interactions): ≤ target → affare (verde), ≤ max bid → giusto (teal),
// oltre → sovrapprezzo (rosso). `wait` finché manca il prezzo. Il testo
// resta quello sfumato di `verdict()`; qui si sceglie solo colore + glow.
export function verdictTone(
  price: number | null,
  val: ValuationWithPlayer | undefined,
): VerdictTone {
  if (val === undefined || price === null) return "wait";
  if (price <= val.target) return "good";
  if (price <= val.max_bid) return "fair";
  return "over";
}

export interface LadderTick {
  key: string;
  label: string;
  value: number;
  pct: number;
  accent: boolean;
  row: 0 | 1;
}

export interface LadderModel {
  ticks: LadderTick[];
  fvZone: { left: number; width: number };
  overZone: { left: number; width: number };
  markerPct: number | null;
}

// Il dominio parte poco sotto il target e finisce poco oltre il panic: le
// quattro soglie sono vicine, uno 0..panic le schiaccerebbe. I tick sono
// sfalsati su due file (row 0/1) perché le etichette non si sovrappongano.
export function ladderModel(
  val: ValuationWithPlayer | undefined,
  price: number | null,
): LadderModel | null {
  if (val === undefined) return null;
  const lo = Math.max(0, val.target * 0.55);
  const hi = val.panic_price * 1.06;
  const span = hi - lo || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  const ticks: LadderTick[] = [
    { key: "t", label: "Target", value: val.target, pct: pct(val.target), accent: false, row: 0 },
    {
      key: "f",
      label: "Fair value",
      value: val.fair_value,
      pct: pct(val.fair_value),
      accent: true,
      row: 1,
    },
    {
      key: "m",
      label: "Max bid",
      value: val.max_bid,
      pct: pct(val.max_bid),
      accent: false,
      row: 0,
    },
    {
      key: "p",
      label: "Panic",
      value: val.panic_price,
      pct: pct(val.panic_price),
      accent: false,
      row: 1,
    },
  ];

  return {
    ticks,
    fvZone: { left: pct(val.target), width: pct(val.max_bid) - pct(val.target) },
    overZone: { left: pct(val.max_bid), width: pct(val.panic_price) - pct(val.max_bid) },
    markerPct: price === null ? null : pct(price),
  };
}

export interface Impact {
  text: string;
  color: string;
}

function totalFreeSlots(status: ManagerAuctionStatus): number {
  return status.slots.reduce((sum, slot) => sum + Math.max(slot.free, 0), 0);
}

// Effetto dell'acquisto sul manager selezionato: oltre il max bid rettificato o
// slot ruolo pieni (magenta), altrimenti quanto resterebbe per slot.
export function impact(
  price: number | null,
  status: ManagerAuctionStatus | undefined,
  ruolo: Role,
): Impact {
  if (status === undefined || price === null) return { text: "", color: COLOR_MUTED };
  const slot = status.slots.find((s) => s.ruolo === ruolo);
  if (price > status.adjustedMaxBid) {
    return {
      text: `Oltre il max bid rettificato di ${status.managerName} (${status.adjustedMaxBid}): la rosa non si completerebbe.`,
      color: COLOR_WARN,
    };
  }
  if (slot && slot.free <= 0) {
    return {
      text: `Slot ${ruolo} di ${status.managerName} già pieni (${slot.used}/${slot.total}).`,
      color: COLOR_WARN,
    };
  }
  const residuoAfter = status.residuo - price;
  const freeAfter = totalFreeSlots(status) - 1;
  const avg = freeAfter > 0 ? Math.floor(residuoAfter / freeAfter) : 0;
  return {
    text: `${status.managerName} resterebbe con ${residuoAfter} crediti per ${freeAfter} slot — ${avg} di media.`,
    color: COLOR_MUTED,
  };
}

export interface GkPairingSuggestion {
  referenceTeam: string;
  team: string;
  score: number;
}

// Suggerisce la squadra più favorevole per il prossimo portiere, in base
// all'ultimo portiere acquistato (riferimento) e alla matrice `gk_pairing`
// (punteggio più basso = coppia più favorevole, vedi shared/src/gkPairing.ts).
// Scarta le squadre di cui possiedo già un portiere e quelle senza portieri
// ancora liberi nel pool, passando alla successiva per favorevolezza.
export function gkPairingSuggestionFor(
  myGoalkeeperTeams: string[],
  pairing: GkPairingEntry[],
  isTeamGoalkeeperAvailable: (team: string) => boolean,
): GkPairingSuggestion | null {
  if (myGoalkeeperTeams.length === 0) return null;
  const referenceTeam = myGoalkeeperTeams[myGoalkeeperTeams.length - 1]!;
  const owned = new Set(myGoalkeeperTeams);
  const candidates = pairing
    .filter((e) => e.teamA === referenceTeam || e.teamB === referenceTeam)
    .map((e) => ({ team: e.teamA === referenceTeam ? e.teamB : e.teamA, score: e.score }))
    .filter((c) => !owned.has(c.team))
    .sort((a, b) => a.score - b.score);
  const best = candidates.find((c) => isTeamGoalkeeperAvailable(c.team));
  return best ? { referenceTeam, ...best } : null;
}

// Fasce del motore consigli che contano come "giocatore forte" per l'avviso
// contestuale durante l'asta (vedi TIER_THRESHOLDS in
// shared/src/recommendationEngine.ts).
export const STRONG_TIERS: ReadonlySet<string> = new Set(["Top", "Solido"]);

// Massimo spendibile di un manager sul giocatore in chiamata: il max bid
// rettificato (unica fonte di verità in shared/src/maxBid.ts, già calcolato
// per ogni manager e servito in `adjustedMaxBid`), azzerato se gli slot di
// quel ruolo sono già pieni.
export function maxSpendableOn(status: ManagerAuctionStatus, ruolo: Role): number {
  const slot = status.slots.find((s) => s.ruolo === ruolo);
  if (slot && slot.free <= 0) return 0;
  return status.adjustedMaxBid;
}

export interface OpponentSummary {
  managerId: number;
  name: string;
  residuo: number;
  freeSlots: RoleSlotStatus[];
  maxOnCurrent: number;
}

// Riepilogo per ogni avversario (manager non proprietario) rispetto al ruolo
// del giocatore in chiamata. Puro consumo di `ManagerAuctionStatus`, a sua
// volta derivato dal log `purchase`.
export function opponentSummaries(
  statuses: ManagerAuctionStatus[] | null,
  ruolo: Role | null,
): OpponentSummary[] {
  return (statuses ?? [])
    .filter((s) => !s.isOwner)
    .map((s) => ({
      managerId: s.managerId,
      name: s.managerName,
      residuo: s.residuo,
      freeSlots: s.slots,
      maxOnCurrent: ruolo === null ? s.adjustedMaxBid : maxSpendableOn(s, ruolo),
    }));
}

export interface OpponentRosterSlot {
  ruolo: Role;
  used: number;
  total: number;
}

export interface OpponentRosterCard {
  managerId: number;
  name: string;
  residuo: number;
  maxOnCurrent: number;
  slots: OpponentRosterSlot[];
  roster: { player_id: number; name: string; ruolo: Role; prezzo: number }[];
}

// Stato completo di ogni avversario per il dialog "Rose avversari & crediti
// residui" (handoff § 3). Puro join tra `ManagerAuctionStatus` (residuo,
// max bid rettificato, slot) e `ManagerRoster` (giocatori acquistati con
// prezzo pagato) — entrambi derivati dal log `purchase` lato server.
export function opponentRosterCards(
  statuses: ManagerAuctionStatus[] | null,
  rosters: ManagerRoster[] | null,
  ruolo: Role | null,
): OpponentRosterCard[] {
  const rosterByManager = new Map((rosters ?? []).map((r) => [r.managerId, r]));
  return (statuses ?? [])
    .filter((s) => !s.isOwner)
    .map((s) => ({
      managerId: s.managerId,
      name: s.managerName,
      residuo: s.residuo,
      maxOnCurrent: ruolo === null ? s.adjustedMaxBid : maxSpendableOn(s, ruolo),
      slots: s.slots.map((slot) => ({
        ruolo: slot.ruolo,
        used: slot.used,
        total: slot.total,
      })),
      roster: (rosterByManager.get(s.managerId)?.players ?? [])
        .slice()
        .sort((a, b) => b.prezzo - a.prezzo)
        .map((p) => ({
          player_id: p.player_id,
          name: p.name,
          ruolo: p.ruolo,
          prezzo: p.prezzo,
        })),
    }));
}

export interface StrongRoleAlert {
  managerId: number;
  name: string;
  strong: number;
  total: number;
  text: string;
}

// Avviso contestuale: avversari che hanno già preso giocatori forti nel ruolo
// del giocatore in chiamata. `strong` = tier Top/Solido dal motore consigli;
// `total` = tutti i giocatori dell'avversario in quel reparto.
export function strongRoleAlerts(
  rosters: ManagerRoster[] | null,
  ruolo: Role | null,
): StrongRoleAlert[] {
  if (ruolo === null) return [];
  return (rosters ?? [])
    .filter((r) => !r.isOwner)
    .map((r) => {
      const inRole = r.players.filter((p) => p.ruolo === ruolo);
      const strong = inRole.filter((p) => STRONG_TIERS.has(p.tier)).length;
      return {
        managerId: r.managerId,
        name: r.managerName,
        strong,
        total: inRole.length,
        text: `${r.managerName}: già ${strong} ${ROLE_LABEL[ruolo]} forti (${inRole.length} in reparto)`,
      };
    })
    .filter((a) => a.strong >= 1)
    .sort((a, b) => b.strong - a.strong);
}

export interface RankRow {
  player: Player;
  valuation: ValuationWithPlayer | undefined;
}

export type CompareSortKey = "fair_value" | "target" | "max_bid" | "fm" | "fvm" | "qt_a" | "score";

// Confronto per ruolo derivato client-side dai dati già scaricati (players +
// valutazioni per-lega + log): stesso ruolo, non ancora acquistati, ordinati
// per `sortValueFor` desc (nulls in fondo) → nome. Nessun endpoint dedicato,
// nessuno stato memorizzato.
export function rankSameRole(
  players: Player[],
  valuations: ValuationWithPlayer[],
  purchasedPlayerIds: Set<number>,
  ruolo: Role,
  sortValueFor: (playerId: number) => number | null,
): RankRow[] {
  const rows: RankRow[] = players
    .filter((player) => player.ruolo === ruolo && !purchasedPlayerIds.has(player.id))
    .map((player) => ({
      player,
      valuation: valuations.find((v) => v.player_id === player.id),
    }));

  return rows.sort((a, b) => {
    const av = sortValueFor(a.player.id);
    const bv = sortValueFor(b.player.id);
    if (av !== null && bv !== null) {
      if (bv !== av) return bv - av;
      return a.player.name.localeCompare(b.player.name);
    }
    if (av !== null) return -1;
    if (bv !== null) return 1;
    return a.player.name.localeCompare(b.player.name);
  });
}
