// Independent daily quota for SoFIFA, separate from API-Football's budget so
// the two providers never contend for each other's allowance. In-memory only:
// a restart resetting the counter early is an acceptable tradeoff for an
// optional, best-effort enrichment.
const DAILY_LIMIT = 90;

let dayKey = "";
let count = 0;

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Reserves one unit of daily quota; returns false when exhausted, in which
// case the caller must skip the external call rather than error.
export function tryConsume(): boolean {
  const today = currentDayKey();
  if (today !== dayKey) {
    dayKey = today;
    count = 0;
  }
  if (count >= DAILY_LIMIT) return false;
  count += 1;
  return true;
}
