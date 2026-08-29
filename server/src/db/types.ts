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

export interface UserValuationOverrideRow {
  user_id: number;
  league_id: number;
  player_id: number;
  target: number | null;
  fair_value: number | null;
  max_bid: number | null;
  panic_price: number | null;
  note: string | null;
}

export interface UserTeamPrefRow {
  user_id: number;
  league_id: number;
  team: string;
  kind: "prefer" | "avoid";
}

export interface ManagerRow {
  id: number;
  league_id: number;
  name: string;
  is_owner: boolean;
  user_id: number | null;
}

export interface AppUserRow {
  id: number;
  username: string;
  password_hash: string;
  avatar: string | null;
  avatar_color: string | null;
}

export interface ChatMessageRow {
  id: number;
  from_user: number;
  to_user: number;
  body: string;
  created_at: Date;
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
