import { pool } from "../db/client";
import { listPlayers, backfillPlayerSofifaId } from "../db/players";
import { normalizeForMatch } from "../stats/matchPlayer";

// Populates player.sofifa_id by crawling Serie A squads on SoFIFA and matching
// by name (disambiguated by team). SoFIFA has no name-search endpoint, so the
// only way to resolve our players to a /player/{id} is to pull the squads via
// /league/{id}/{roster} + /team/{id}/{roster} and match locally.
//
// Config via env:
//   SOFIFA_BASE_URL   default https://api.sofifa.net
//   SOFIFA_LEAGUE_ID  default 31 (Serie A on SoFIFA)
//   SOFIFA_ROSTER     required — the dataset version id (e.g. "260046" for the
//                     latest FC26 update). It changes with each SoFIFA update;
//                     read the current one from the roster picker on sofifa.com.
//
// Matching never guesses: a unique normalized-name match wins; a name collision
// is resolved only if exactly one candidate also matches team, otherwise the
// player is left unmapped (reported as ambiguous). backfill is guarded by
// `sofifa_id IS NULL`, so re-running never overwrites a trusted mapping.

interface SofifaCandidate {
  sofifaId: number;
  name: string;
  team: string;
}

function baseUrl(): string {
  return process.env.SOFIFA_BASE_URL ?? "https://api.sofifa.net";
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(new URL(path, baseUrl()), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function playerName(entry: Record<string, unknown>): string {
  const common = entry.commonName;
  if (typeof common === "string" && common.trim() !== "") return common;
  const first = typeof entry.firstName === "string" ? entry.firstName : "";
  const last = typeof entry.lastName === "string" ? entry.lastName : "";
  return `${first} ${last}`.trim();
}

// The exact squad field name is not documented; scan defensively for the first
// array whose elements look like players (numeric id + a usable name).
function extractSquad(teamJson: unknown): SofifaCandidate[] {
  const data = asRecord(asRecord(teamJson)?.data);
  if (!data) return [];
  const teamName = typeof data.name === "string" ? data.name : "";

  const candidateArrays = [data.players, data.squad, ...Object.values(data)].filter(
    Array.isArray,
  ) as unknown[][];

  for (const arr of candidateArrays) {
    const players: SofifaCandidate[] = [];
    for (const raw of arr) {
      const entry = asRecord(raw);
      if (!entry || typeof entry.id !== "number") continue;
      const name = playerName(entry);
      if (name === "") continue;
      players.push({ sofifaId: entry.id, name, team: teamName });
    }
    if (players.length > 0) return players;
  }
  return [];
}

function extractTeamIds(leagueJson: unknown): number[] {
  const data = asRecord(leagueJson)?.data;
  const arr = Array.isArray(data) ? data : Array.isArray(asRecord(data)?.teams) ? (asRecord(data)!.teams as unknown[]) : [];
  const ids: number[] = [];
  for (const raw of arr) {
    const entry = asRecord(raw);
    if (entry && typeof entry.id === "number") ids.push(entry.id);
  }
  return ids;
}

async function collectCandidates(leagueId: string, roster: string): Promise<SofifaCandidate[]> {
  const league = await fetchJson(`/league/${leagueId}/${roster}`);
  const teamIds = extractTeamIds(league);
  if (teamIds.length === 0) {
    throw new Error(
      `Nessuna squadra da /league/${leagueId}/${roster}. Verifica SOFIFA_LEAGUE_ID e SOFIFA_ROSTER.`,
    );
  }
  console.log(`[sofifa] ${teamIds.length} squadre per lega ${leagueId} roster ${roster}`);

  const all: SofifaCandidate[] = [];
  for (const teamId of teamIds) {
    try {
      const squad = extractSquad(await fetchJson(`/team/${teamId}/${roster}`));
      all.push(...squad);
    } catch (err) {
      console.error(`[sofifa] team ${teamId}: fetch fallito`, err);
    }
  }
  return all;
}

async function seedSofifaIds(): Promise<void> {
  const leagueId = process.env.SOFIFA_LEAGUE_ID ?? "31";
  const roster = process.env.SOFIFA_ROSTER;
  if (!roster) {
    throw new Error(
      "SOFIFA_ROSTER non impostato: serve l'id della versione dataset (es. 260046). " +
        "Leggilo dal selettore roster su sofifa.com.",
    );
  }

  const candidates = await collectCandidates(leagueId, roster);
  const byName = new Map<string, SofifaCandidate[]>();
  for (const c of candidates) {
    const key = normalizeForMatch(c.name);
    const list = byName.get(key) ?? [];
    list.push(c);
    byName.set(key, list);
  }

  const players = (await listPlayers()).filter((p) => p.sofifa_id === null);
  let matched = 0;
  let ambiguous = 0;
  let unmatched = 0;

  for (const player of players) {
    const hits = byName.get(normalizeForMatch(player.name)) ?? [];
    let chosen: SofifaCandidate | undefined;
    if (hits.length === 1) {
      chosen = hits[0];
    } else if (hits.length > 1) {
      const teamHits = hits.filter(
        (c) => normalizeForMatch(c.team) === normalizeForMatch(player.team),
      );
      if (teamHits.length === 1) chosen = teamHits[0];
    }

    if (!chosen) {
      if (hits.length === 0) unmatched += 1;
      else ambiguous += 1;
      continue;
    }
    const updated = await backfillPlayerSofifaId(player.id, chosen.sofifaId);
    if (updated > 0) matched += 1;
  }

  console.log(
    `[sofifa] mapping completato: ${matched} associati, ${ambiguous} ambigui, ${unmatched} senza match ` +
      `(su ${players.length} giocatori senza sofifa_id, ${candidates.length} candidati SoFIFA)`,
  );
}

seedSofifaIds()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
