// Explicit, conservative name matching: no fuzzy/probabilistic matching. If
// normalized name+team don't match exactly, the player stays unmatched
// (empty), never a guessed/estimated stat.
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").trim().toLowerCase();
}

export function isSamePlayer(
  a: { name: string; team: string },
  b: { name: string; team: string },
): boolean {
  return (
    normalizeForMatch(a.name) === normalizeForMatch(b.name) &&
    normalizeForMatch(a.team) === normalizeForMatch(b.team)
  );
}
