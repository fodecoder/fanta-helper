import type { Role } from "./roles";

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface Valuation {
  name: string;
  team: string;
  ruolo: Role;
  tier: string;
  target: number;
  fair_value: number;
  max_bid: number;
  panic_price: number;
  confidence: Confidence;
  note?: string;
}

export interface ValuationImport {
  league_name: string;
  generated_at: string;
  players: Valuation[];
}
