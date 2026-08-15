import type { Role } from "./roles";

export type RosterConfig = Record<Role, number>;
export type ScoringConfig = Record<string, unknown>;
export type ModifiersConfig = Record<string, unknown>;

export interface LeagueRulesConfig {
  rosterConfig: RosterConfig;
  scoring: ScoringConfig;
  modificatori: ModifiersConfig;
}
