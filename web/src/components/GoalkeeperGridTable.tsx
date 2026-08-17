import { useEffect, useMemo, useState } from "react";
import type { GoalkeeperGridEntry } from "@fanta-helper/shared";
import * as gridApi from "../api/goalkeeperGrid";
import { StatusMessage } from "./StatusMessage";

interface TeamRow {
  team: string;
  ranks: { rank: number; name: string }[];
}

function groupByTeam(entries: GoalkeeperGridEntry[]): TeamRow[] {
  const byTeam = new Map<string, TeamRow>();
  for (const entry of entries) {
    let row = byTeam.get(entry.team);
    if (!row) {
      row = { team: entry.team, ranks: [] };
      byTeam.set(entry.team, row);
    }
    row.ranks.push({ rank: entry.rank, name: entry.name });
  }
  for (const row of byTeam.values()) row.ranks.sort((a, b) => a.rank - b.rank);
  return [...byTeam.values()].sort((a, b) => a.team.localeCompare(b.team));
}

interface GoalkeeperGridTableProps {
  refreshToken?: number;
}

// Tabella di sola consultazione: legge la griglia portieri globale e la mostra
// una riga per squadra. Riutilizzata nella pagina dedicata e nell'asta.
export function GoalkeeperGridTable({ refreshToken = 0 }: GoalkeeperGridTableProps) {
  const [entries, setEntries] = useState<GoalkeeperGridEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    gridApi
      .listGoalkeeperGrid(controller.signal)
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

  const rows = useMemo(() => groupByTeam(entries ?? []), [entries]);
  const maxRank = useMemo(
    () => rows.reduce((max, row) => Math.max(max, ...row.ranks.map((r) => r.rank)), 0),
    [rows],
  );

  if (loadError) return <StatusMessage kind="error">{loadError}</StatusMessage>;
  if (entries === null) return <StatusMessage kind="loading">Caricamento…</StatusMessage>;
  if (rows.length === 0)
    return <StatusMessage kind="empty">Nessuna griglia portieri importata.</StatusMessage>;

  const rankHeaders = Array.from({ length: maxRank }, (_, i) => i + 1);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Squadra</th>
            {rankHeaders.map((rank) => (
              <th key={rank}>{rank === 1 ? "Titolare" : `Riserva ${rank - 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team}>
              <td>{row.team}</td>
              {rankHeaders.map((rank) => (
                <td key={rank}>{row.ranks.find((r) => r.rank === rank)?.name ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
