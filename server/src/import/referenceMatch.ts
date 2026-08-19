import type { PlayerRow } from "../db/types";
import { parseNullableInt } from "./numeric";

function nameTeamKey(name: string, team: string): string {
  return `${name.trim().toLowerCase()}|${team.trim().toLowerCase()}`;
}

export interface PlayerIndex {
  byFantaId: Map<number, PlayerRow>;
  byNameTeam: Map<string, PlayerRow[]>;
}

export function buildPlayerIndex(players: PlayerRow[]): PlayerIndex {
  const byFantaId = new Map<number, PlayerRow>();
  const byNameTeam = new Map<string, PlayerRow[]>();
  for (const player of players) {
    if (player.fanta_id !== null) {
      byFantaId.set(player.fanta_id, player);
    }
    const key = nameTeamKey(player.name, player.team);
    const bucket = byNameTeam.get(key);
    if (bucket) {
      bucket.push(player);
    } else {
      byNameTeam.set(key, [player]);
    }
  }
  return { byFantaId, byNameTeam };
}

export type MatchResult =
  | { status: "matched"; player: PlayerRow; fantaIdFromFile: number | null; matchedBy: "fanta_id" | "name_team" }
  | { status: "discarded"; reason: string };

// fanta_id-first, name+team fallback: mai inventare un match, ambiguità e
// assenze finiscono nel report di scarto.
export function matchPlayerRow(
  index: PlayerIndex,
  fantaIdRaw: string,
  name: string,
  team: string,
): MatchResult {
  const trimmedName = name.trim();
  const trimmedTeam = team.trim();
  if (trimmedName === "" || trimmedTeam === "") {
    return { status: "discarded", reason: "nome o squadra mancante" };
  }

  const parsedId = parseNullableInt(fantaIdRaw);
  const fantaIdFromFile = parsedId.ok ? parsedId.value : null;

  if (fantaIdFromFile !== null) {
    const byId = index.byFantaId.get(fantaIdFromFile);
    if (byId) {
      return { status: "matched", player: byId, fantaIdFromFile, matchedBy: "fanta_id" };
    }
  }

  const candidates = index.byNameTeam.get(nameTeamKey(trimmedName, trimmedTeam)) ?? [];
  if (candidates.length === 0) {
    return {
      status: "discarded",
      reason: "nessun giocatore corrispondente nel pool (fanta_id e name+team non trovati)",
    };
  }
  if (candidates.length > 1) {
    return { status: "discarded", reason: "corrispondenza name+team ambigua (più giocatori)" };
  }
  return { status: "matched", player: candidates[0]!, fantaIdFromFile, matchedBy: "name_team" };
}
