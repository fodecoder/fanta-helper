import { useEffect, useMemo, useState } from "react";
import type {
  ProbableLineupEntry,
  SetPieceTakerEntry,
  SetPieceTakerTipo,
  Role,
} from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import * as setPieceTakerApi from "../api/setPieceTaker";
import { StatusMessage } from "./StatusMessage";
import { roleColor } from "../lib/auctionDerivations";

interface TeamGroup {
  team: string;
  titolari: ProbableLineupEntry[];
  panchina: ProbableLineupEntry[];
  ballottaggio: ProbableLineupEntry[];
}

const ROLE_ORDER = ["P", "D", "C", "A"];

function roleRank(ruolo: string | null): number {
  if (!ruolo) return ROLE_ORDER.length;
  const idx = ROLE_ORDER.indexOf(ruolo.toUpperCase());
  return idx === -1 ? ROLE_ORDER.length : idx;
}

function byRole(a: ProbableLineupEntry, b: ProbableLineupEntry): number {
  return roleRank(a.ruolo) - roleRank(b.ruolo);
}

// `extraTeams` copre le squadre che hanno solo calci piazzati confermati e
// ancora nessuna formazione: i due ingest sono indipendenti.
function groupByTeam(entries: ProbableLineupEntry[], extraTeams: Iterable<string>): TeamGroup[] {
  const byTeam = new Map<string, TeamGroup>();
  function ensure(team: string): TeamGroup {
    let group = byTeam.get(team);
    if (!group) {
      group = { team, titolari: [], panchina: [], ballottaggio: [] };
      byTeam.set(team, group);
    }
    return group;
  }
  for (const entry of entries) {
    const group = ensure(entry.team);
    if (entry.stato === "titolare") group.titolari.push(entry);
    else if (entry.stato === "panchina") group.panchina.push(entry);
    else group.ballottaggio.push(entry);
  }
  for (const team of extraTeams) ensure(team);
  for (const group of byTeam.values()) {
    group.titolari.sort(byRole);
    group.panchina.sort(byRole);
    group.ballottaggio.sort(byRole);
  }
  return [...byTeam.values()].sort((a, b) => a.team.localeCompare(b.team));
}

const SET_PIECE_TAKER_LABELS: Record<SetPieceTakerTipo, string> = {
  rigore: "Rigoristi",
  punizione: "Punizioni",
  corner: "Corner",
};

function groupSetPieceTakersByTeam(
  entries: SetPieceTakerEntry[],
): Map<string, Record<SetPieceTakerTipo, SetPieceTakerEntry[]>> {
  const byTeam = new Map<string, Record<SetPieceTakerTipo, SetPieceTakerEntry[]>>();
  for (const entry of entries) {
    let group = byTeam.get(entry.team);
    if (!group) {
      group = { rigore: [], punizione: [], corner: [] };
      byTeam.set(entry.team, group);
    }
    group[entry.tipo].push(entry);
  }
  for (const group of byTeam.values()) {
    for (const tipo of Object.keys(group) as SetPieceTakerTipo[]) {
      group[tipo].sort((a, b) => a.rank - b.rank);
    }
  }
  return byTeam;
}

// Modulo calcolato solo a scopo di visualizzazione, mai persistito: se i
// titolari non sono esattamente 11 con ruoli noti, viene omesso.
function computeModulo(titolari: ProbableLineupEntry[]): string | null {
  if (titolari.length !== 11) return null;
  const outfield = titolari.filter((p) => p.ruolo?.toUpperCase() !== "P");
  if (outfield.length !== 10 || outfield.some((p) => !p.ruolo)) return null;
  const counts = new Map<string, number>();
  for (const p of outfield) {
    const key = p.ruolo!.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order = ["D", "C", "A"];
  if (![...counts.keys()].every((k) => order.includes(k))) return null;
  return order
    .filter((k) => counts.has(k))
    .map((k) => counts.get(k))
    .join("-");
}

function RoleTag({ ruolo }: { ruolo: string | null }) {
  if (!ruolo)
    return (
      <span className="role-tag" style={{ width: 14, color: "var(--color-neutral-500)" }}>
        ·
      </span>
    );
  const upper = ruolo.toUpperCase();
  const known = ["P", "D", "C", "A"].includes(upper);
  return (
    <span
      className="role-tag"
      style={{ width: 14, color: known ? roleColor(upper as Role) : "var(--color-neutral-700)" }}
    >
      {upper}
    </span>
  );
}

interface ProbableLineupBoardProps {
  refreshToken?: number;
}

export function ProbableLineupBoard({ refreshToken = 0 }: ProbableLineupBoardProps) {
  const [entries, setEntries] = useState<ProbableLineupEntry[] | null>(null);
  const [setPieceTakers, setSetPieceTakers] = useState<SetPieceTakerEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lineupApi
      .listProbableLineup(controller.signal)
      .then((data) => {
        setEntries(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento fallito");
      });
    return () => controller.abort();
  }, [refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    setPieceTakerApi
      .listSetPieceTakers(controller.signal)
      .then((data) => setSetPieceTakers(data))
      .catch(() => {
        // Sezione secondaria: un errore qui non blocca la vista principale.
      });
    return () => controller.abort();
  }, [refreshToken]);

  const setPieceTakersByTeam = useMemo(
    () => groupSetPieceTakersByTeam(setPieceTakers),
    [setPieceTakers],
  );
  const groups = useMemo(
    () => groupByTeam(entries ?? [], setPieceTakersByTeam.keys()),
    [entries, setPieceTakersByTeam],
  );

  if (loadError) return <StatusMessage kind="error">{loadError}</StatusMessage>;
  if (entries === null) return <StatusMessage kind="loading">Caricamento…</StatusMessage>;
  if (groups.length === 0)
    return <StatusMessage kind="empty">Nessuna formazione confermata.</StatusMessage>;

  const active = groups.find((g) => g.team === selectedTeam) ?? groups[0]!;
  const modulo = computeModulo(active.titolari);
  const takers = setPieceTakersByTeam.get(active.team);
  const tipi = Object.keys(SET_PIECE_TAKER_LABELS) as SetPieceTakerTipo[];
  const hasSetPieces = takers && tipi.some((tipo) => takers[tipo].length > 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {groups.map((g) => {
          const on = g.team === active.team;
          return (
            <button
              key={g.team}
              type="button"
              className="chip"
              onClick={() => setSelectedTeam(g.team)}
              style={
                on
                  ? {
                      borderColor: "var(--color-accent)",
                      background: "var(--color-accent)",
                      color: "var(--color-bg)",
                      fontWeight: 600,
                    }
                  : undefined
              }
            >
              {g.team}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>{active.team}</h2>
        {modulo && (
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>modulo {modulo}</span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 40,
          maxWidth: 880,
        }}
      >
        <div>
          <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
            Undici probabile
          </h6>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {active.titolari.map((p) => (
              <div
                key={p.player_name}
                style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 14 }}
              >
                <RoleTag ruolo={p.ruolo} />
                <span>{p.player_name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          {active.ballottaggio.length > 0 && (
            <>
              <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
                Ballottaggio
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 26 }}>
                {active.ballottaggio.map((p) => (
                  <div
                    key={p.player_name}
                    style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 14 }}
                  >
                    <RoleTag ruolo={p.ruolo} />
                    <span>{p.player_name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {active.panchina.length > 0 && (
            <>
              <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>Panchina</h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {active.panchina.map((p) => (
                  <div
                    key={p.player_name}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 9,
                      fontSize: 14,
                      color: "var(--color-neutral-800)",
                    }}
                  >
                    <RoleTag ruolo={p.ruolo} />
                    <span>{p.player_name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          {hasSetPieces && (
            <>
              <h6 style={{ margin: "0 0 10px", color: "var(--color-neutral-700)" }}>
                Calci piazzati
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {tipi.map((tipo) =>
                  takers![tipo].length > 0 ? (
                    <div key={tipo}>
                      <div style={{ font: "600 13px/1.2 var(--font-heading)", marginBottom: 4 }}>
                        {SET_PIECE_TAKER_LABELS[tipo]}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {takers![tipo].map((p, i) => (
                          <div
                            key={p.player_name}
                            style={{ fontSize: 14, color: "var(--color-neutral-800)" }}
                          >
                            {i + 1}. {p.player_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
