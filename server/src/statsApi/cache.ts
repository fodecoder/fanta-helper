export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory, per-process cache for the optional stats enrichment. Resetting
// on restart/redeploy is acceptable: this is non-domain, non-critical data,
// not something that needs a migration or to survive across instances.
const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
