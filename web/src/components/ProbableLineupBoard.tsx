import { useEffect, useMemo, useState } from "react";
import type { ProbableLineupEntry, SetPieceTakerEntry, SetPieceTakerTipo } from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import * as setPieceTakerApi from "../api/setPieceTaker";
import { StatusMessage } from "./StatusMessage";

interface TeamGroup {
  team: string;
  titolari: ProbableLineupEntry[];
  panchina: ProbableLineupEntry[];
  ballottaggio: ProbableLineupEntry[];
}

// `extraTeams` copre le squadre che hanno solo calci piazzati confermati e
// ancora nessuna formazione: i due ingest sono indipendenti (screenshot
// separati), quindi una squadra deve comparire nello switcher anche se uno
// solo dei due dataset è popolato.
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
// titolari non hanno tutti un ruolo noto o non sono esattamente 11, il
// modulo viene omesso piuttosto che indovinato.
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
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Sezione secondaria: un errore qui non deve bloccare la vista
        // principale delle formazioni, che ha già il proprio stato di errore.
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

  return (
    <div>
      <nav className="nav">
        {groups.map((g) => (
          <button
            key={g.team}
            type="button"
            className="nav-button"
            onClick={() => setSelectedTeam(g.team)}
            disabled={g.team === active.team}
          >
            {g.team}
          </button>
        ))}
      </nav>

      <div className="card">
        <h2>
          {active.team}
          {(() => {
            const modulo = computeModulo(active.titolari);
            return modulo ? ` — modulo ${modulo}` : "";
          })()}
        </h2>

        <div>
          <strong>Undici probabile</strong>
          <ul>
            {active.titolari.map((p) => (
              <li key={p.player_name}>
                {p.player_name}
                {p.ruolo ? ` (${p.ruolo})` : ""}
              </li>
            ))}
          </ul>
        </div>

        {active.ballottaggio.length > 0 && (
          <div>
            <strong>Ballottaggio</strong>
            <ul>
              {active.ballottaggio.map((p) => (
                <li key={p.player_name}>
                  {p.player_name}
                  {p.ruolo ? ` (${p.ruolo})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {active.panchina.length > 0 && (
          <div>
            <strong>Panchina</strong>
            <ul>
              {active.panchina.map((p) => (
                <li key={p.player_name}>
                  {p.player_name}
                  {p.ruolo ? ` (${p.ruolo})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(() => {
          const takers = setPieceTakersByTeam.get(active.team);
          if (!takers) return null;
          const tipi = Object.keys(SET_PIECE_TAKER_LABELS) as SetPieceTakerTipo[];
          if (tipi.every((tipo) => takers[tipo].length === 0)) return null;
          return (
            <div>
              <strong>Calci piazzati</strong>
              {tipi.map(
                (tipo) =>
                  takers[tipo].length > 0 && (
                    <div key={tipo}>
                      <em>{SET_PIECE_TAKER_LABELS[tipo]}</em>
                      <ol>
                        {takers[tipo].map((p) => (
                          <li key={p.player_name}>{p.player_name}</li>
                        ))}
                      </ol>
                    </div>
                  ),
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
