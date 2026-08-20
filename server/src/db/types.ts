import type { Role, Confidence, RosterConfig, ScoringConfig, ModifiersConfig } from "@fanta-helper/shared";

export interface LeagueRow {
  id: number;
  name: string;
  n_squadre: number;
  budget: number;
  roster_config: RosterConfig;
  scoring: ScoringConfig;
  modificatori: ModifiersConfig;
}

export interface PlayerRow {
  id: number;
  fanta_id: number | null;
  sofifa_id: number | null;
  name: string;
  team: string;
  ruolo: Role;
  image_url: string | null;
}

export interface QuotationRow {
  player_id: number;
  season: string;
  qt_i: number | null;
  qt_a: number | null;
  fvm: number | null;
}

export interface PlayerSeasonStatsRow {
  player_id: number;
  season: string;
  presenze: number | null;
  mv: number | null;
  fm: number | null;
  gf: number | null;
  gs: number | null;
  assist: number | null;
  rp: number | null;
  rc: number | null;
  rig_plus: number | null;
  rig_minus: number | null;
  amm: number | null;
  esp: number | null;
  autogol: number | null;
}

export interface ValuationRow {
  league_id: number;
  player_id: number;
  tier: string;
  target: number;
  fair_value: number;
  max_bid: number;
  panic_price: number;
  confidence: Confidence;
  note: string | null;
}

export interface ManagerRow {
  id: number;
  league_id: number;
  name: string;
}

export interface PurchaseRow {
  league_id: number;
  player_id: number;
  manager_id: number;
  prezzo: number;
  ts: Date;
}

export interface WishlistRow {
  league_id: number;
  player_id: number;
  priority: number | null;
  note: string | null;
}
