import { useEffect, useMemo, useState } from "react";
import type { GkPairingEntry } from "@fanta-helper/shared";
import * as gkPairingApi from "../api/gkPairing";
import { StatusMessage } from "./StatusMessage";

interface PartnerRow {
  partner: string;
  score: number;
  display: number;
}

function distinctTeams(entries: GkPairingEntry[]): string[] {
  const teams = new Set<string>();
  for (const entry of entries) {
    teams.add(entry.teamA);
    teams.add(entry.teamB);
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

function partnersFor(entries: GkPairingEntry[], team: string, maxScore: number): PartnerRow[] {
  return entries
    .filter((entry) => entry.teamA === team || entry.teamB === team)
    .map((entry) => ({
      partner: entry.teamA === team ? entry.teamB : entry.teamA,
      score: entry.score,
      display: maxScore - entry.score,
    }))
    .sort((a, b) => a.score - b.score);
}

interface GkPairingPanelProps {
  refreshToken?: number;
}

// Consultazione della matrice coppie portieri: scelta una squadra, mostra i
// compagni ordinati per favorevolezza (display = max punteggio globale −
// punteggio, così alto = più favorevole). Riutilizzata nella pagina dedicata
// e nell'asta.
export function GkPairingPanel({ refreshToken = 0 }: GkPairingPanelProps) {
  const [entries, setEntries] = useState<GkPairingEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTeamOverride, setSelectedTeamOverride] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    gkPairingApi
      .listGkPairing(controller.signal)
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

  const teams = useMemo(() => distinctTeams(entries ?? []), [entries]);
  const maxScore = useMemo(
    () => (entries ?? []).reduce((max, entry) => Math.max(max, entry.score), 0),
    [entries],
  );

  const selectedTeam =
    selectedTeamOverride && teams.includes(selectedTeamOverride)
      ? selectedTeamOverride
      : (teams[0] ?? "");

  const partners = useMemo(
    () => (entries && selectedTeam ? partnersFor(entries, selectedTeam, maxScore) : []),
    [entries, selectedTeam, maxScore],
  );

  if (loadError) return <StatusMessage kind="error">{loadError}</StatusMessage>;
  if (entries === null) return <StatusMessage kind="loading">Caricamento…</StatusMessage>;
  if (teams.length === 0)
    return <StatusMessage kind="empty">Nessuna matrice coppie portieri importata.</StatusMessage>;

  return (
    <div>
      <label>
        Squadra
        <select value={selectedTeam} onChange={(e) => setSelectedTeamOverride(e.target.value)}>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </label>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Squadra</th>
              <th>Favorevolezza</th>
              <th>Punteggio</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((row) => (
              <tr key={row.partner}>
                <td>{row.partner}</td>
                <td>{row.display}</td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
