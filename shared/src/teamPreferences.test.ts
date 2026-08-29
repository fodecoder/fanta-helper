import { describe, expect, it } from "vitest";
import { applyTeamPreferences } from "./teamPreferences";
import type { TeamPrefKind } from "./teamPref";

interface Row {
  player_id: number;
  team: string;
  tier: string;
  score: number;
}

// Lista ordinata per score desc, come la restituisce il motore.
const list: Row[] = [
  { player_id: 1, team: "Inter", tier: "Top", score: 30 },
  { player_id: 2, team: "Roma", tier: "Top", score: 28 },
  { player_id: 3, team: "Lecce", tier: "Top", score: 26 },
  { player_id: 4, team: "Inter", tier: "Solido", score: 20 },
  { player_id: 5, team: "Roma", tier: "Solido", score: 18 },
  { player_id: 6, team: "Lecce", tier: "Solido", score: 16 },
];

function prefs(entries: [string, TeamPrefKind][]): Map<string, TeamPrefKind> {
  return new Map(entries);
}

describe("applyTeamPreferences", () => {
  it("returns the list unchanged (only annotated null) when there are no prefs", () => {
    const result = applyTeamPreferences(list, prefs([]));
    expect(result.map((r) => r.player_id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.every((r) => r.teamPref === null)).toBe(true);
  });

  it("annotates each row with its team preference", () => {
    const result = applyTeamPreferences(list, prefs([["Lecce", "avoid"], ["Roma", "prefer"]]));
    expect(result.find((r) => r.team === "Lecce")?.teamPref).toBe("avoid");
    expect(result.find((r) => r.team === "Roma")?.teamPref).toBe("prefer");
    expect(result.find((r) => r.team === "Inter")?.teamPref).toBe(null);
  });

  it("floats a preferred team up within its tier only", () => {
    const result = applyTeamPreferences(list, prefs([["Lecce", "prefer"]]));
    // Lecce sale in cima alla propria fascia, senza attraversarne i confini.
    expect(result.map((r) => r.player_id)).toEqual([3, 1, 2, 6, 4, 5]);
    expect(result.map((r) => r.tier)).toEqual(["Top", "Top", "Top", "Solido", "Solido", "Solido"]);
  });

  it("demotes an avoided team to the tail of its tier", () => {
    const result = applyTeamPreferences(list, prefs([["Inter", "avoid"]]));
    expect(result.map((r) => r.player_id)).toEqual([2, 3, 1, 5, 6, 4]);
  });

  it("never mutates the score and never crosses a tier boundary", () => {
    const result = applyTeamPreferences(list, prefs([["Roma", "prefer"], ["Inter", "avoid"]]));
    for (const r of result) {
      expect(r.score).toBe(list.find((x) => x.player_id === r.player_id)!.score);
    }
    expect(result.slice(0, 3).every((r) => r.tier === "Top")).toBe(true);
    expect(result.slice(3).every((r) => r.tier === "Solido")).toBe(true);
  });
});
