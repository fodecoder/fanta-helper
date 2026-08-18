import type { ManagerAuctionStatus, Player, Role, ValuationWithPlayer } from "@fanta-helper/shared";

// Colori semantici del verdetto/impatto (token del design system).
export const COLOR_MUTED = "var(--color-neutral-700)";
export const COLOR_GOOD = "var(--color-accent-700)";
export const COLOR_WARN = "var(--color-accent-2-700)";
export const COLOR_INK = "var(--color-text)";

export function roleColor(ruolo: Role): string {
  return `var(--role-${ruolo.toLowerCase()})`;
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

export interface RankRow {
  player: Player;
  valuation: ValuationWithPlayer | undefined;
}

// Confronto per ruolo derivato client-side dai dati già scaricati (players +
// valutazioni per-lega + log): stesso ruolo, non ancora acquistati, ordinati
// per fair value desc → target desc → nome. I giocatori senza valutazione
// finiscono in fondo. Nessun endpoint dedicato, nessuno stato memorizzato.
export function rankSameRole(
  players: Player[],
  valuations: ValuationWithPlayer[],
  purchasedPlayerIds: Set<number>,
  ruolo: Role,
): RankRow[] {
  const rows: RankRow[] = players
    .filter((player) => player.ruolo === ruolo && !purchasedPlayerIds.has(player.id))
    .map((player) => ({
      player,
      valuation: valuations.find((v) => v.player_id === player.id),
    }));

  return rows.sort((a, b) => {
    if (a.valuation && b.valuation) {
      if (b.valuation.fair_value !== a.valuation.fair_value) {
        return b.valuation.fair_value - a.valuation.fair_value;
      }
      if (b.valuation.target !== a.valuation.target) {
        return b.valuation.target - a.valuation.target;
      }
      return a.player.name.localeCompare(b.player.name);
    }
    if (a.valuation) return -1;
    if (b.valuation) return 1;
    return a.player.name.localeCompare(b.player.name);
  });
}
