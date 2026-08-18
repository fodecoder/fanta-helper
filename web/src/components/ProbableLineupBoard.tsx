import { useEffect, useMemo, useState } from "react";
import type { ProbableLineupEntry } from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import { StatusMessage } from "./StatusMessage";

interface TeamGroup {
  team: string;
  titolari: ProbableLineupEntry[];
  panchina: ProbableLineupEntry[];
  ballottaggio: ProbableLineupEntry[];
}

function groupByTeam(entries: ProbableLineupEntry[]): TeamGroup[] {
  const byTeam = new Map<string, TeamGroup>();
  for (const entry of entries) {
    let group = byTeam.get(entry.team);
    if (!group) {
      group = { team: entry.team, titolari: [], panchina: [], ballottaggio: [] };
      byTeam.set(entry.team, group);
    }
    if (entry.stato === "titolare") group.titolari.push(entry);
    else if (entry.stato === "panchina") group.panchina.push(entry);
    else group.ballottaggio.push(entry);
  }
  return [...byTeam.values()].sort((a, b) => a.team.localeCompare(b.team));
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

  const groups = useMemo(() => groupByTeam(entries ?? []), [entries]);

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
      </div>
    </div>
  );
}
