import type { TeamPrefKind } from "./teamPref";

export type WithTeamPref<T> = T & { teamPref: TeamPrefKind | null };

function bias(kind: TeamPrefKind | null): number {
  if (kind === "prefer") return -1;
  if (kind === "avoid") return 1;
  return 0;
}

// Applica le preferenze squadra a una lista di consigli GIÀ ordinata per score
// desc. Due effetti, entrambi non distruttivi:
//   1. annota ogni riga con `teamPref` (match esatto sul nome squadra, lo
//      stesso valore testuale usato altrove — player.team, probable_lineup);
//   2. riordina in modo stabile SOLO entro segmenti consecutivi di pari
//      `tier`: le squadre preferite salgono, quelle da evitare scendono, ma
//      nessuna riga cambia fascia e nessuno score viene toccato.
export function applyTeamPreferences<T extends { team: string; tier: string }>(
  recommendations: readonly T[],
  prefsByTeam: ReadonlyMap<string, TeamPrefKind>,
): WithTeamPref<T>[] {
  const annotated: WithTeamPref<T>[] = recommendations.map((r) => ({
    ...r,
    teamPref: prefsByTeam.get(r.team) ?? null,
  }));

  if (prefsByTeam.size === 0) return annotated;

  const result: WithTeamPref<T>[] = [];
  let i = 0;
  while (i < annotated.length) {
    let j = i;
    while (j < annotated.length && annotated[j]!.tier === annotated[i]!.tier) j++;
    const segment = annotated.slice(i, j);
    segment.sort((a, b) => bias(a.teamPref) - bias(b.teamPref)); // stabile (ES2019+)
    result.push(...segment);
    i = j;
  }
  return result;
}
