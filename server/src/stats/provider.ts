export interface PlayerRef {
  id: number;
  name: string;
  team: string;
  // SoFIFA numeric id, null when the player has no mapping. Providers keyed by
  // name/team ignore it; the SoFIFA provider needs it to resolve /player/{id}.
  sofifaId: number | null;
}

// Single backend interface every stats provider plugs into. Providers expose
// different data axes (performance vs attributes) but share this contract, so
// the aggregator can call any enabled provider uniformly. `enrich` must never
// throw and must never invent data: absent/unmatched players are simply omitted.
export interface StatsProvider<T extends { player_id: number }> {
  readonly source: string;
  isEnabled(): boolean;
  enrich(players: PlayerRef[], season: number): Promise<T[]>;
}
