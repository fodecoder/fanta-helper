import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { GkPairingEntry, GkPairingImportReport } from "@fanta-helper/shared";
import * as gkPairingApi from "../api/gkPairing";
import { GkPairingApiError } from "../api/gkPairing";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface GkPairingPageProps {
  calls: number | null;
}

function distinctTeams(entries: GkPairingEntry[]): string[] {
  const teams = new Set<string>();
  for (const entry of entries) {
    teams.add(entry.teamA);
    teams.add(entry.teamB);
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

export function GkPairingPage({ calls }: GkPairingPageProps) {
  const [entries, setEntries] = useState<GkPairingEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTeamOverride, setSelectedTeamOverride] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<GkPairingImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

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
    () => (entries ?? []).reduce((max, e) => Math.max(max, e.score), 0),
    [entries],
  );
  const selectedTeam =
    selectedTeamOverride && teams.includes(selectedTeamOverride)
      ? selectedTeamOverride
      : (teams[0] ?? "");

  const partners = useMemo(() => {
    if (!entries || !selectedTeam) return [];
    return entries
      .filter((e) => e.teamA === selectedTeam || e.teamB === selectedTeam)
      .map((e) => ({
        partner: e.teamA === selectedTeam ? e.teamB : e.teamA,
        score: e.score,
        display: maxScore - e.score,
      }))
      .sort((a, b) => b.display - a.display);
  }, [entries, selectedTeam, maxScore]);
  const maxDisplay = partners.reduce((max, p) => Math.max(max, p.display), 0) || 1;

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setImportError("seleziona un file CSV o xlsx");
      return;
    }
    setImportError(null);
    setReport(null);
    setSubmitting(true);
    try {
      setReport(await gkPairingApi.importGkPairingFile(file));
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setImportError(
        err instanceof GkPairingApiError ? err.payload.error.message : "import fallito",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMasthead
        kicker="Riferimento globale · matrice coppie"
        title="Coppie portieri"
        subtitle="Matrice squadra×squadra di riferimento: quanto conviene accoppiare due portieri. Alto = più favorevole. Ogni import sostituisce la matrice esistente."
        calls={calls}
      />

      {importError && <StatusMessage kind="error">{importError}</StatusMessage>}

      <form
        onSubmit={handleImport}
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          marginBottom: 34,
          flexWrap: "wrap",
        }}
      >
        <div className="field" style={{ width: 220 }}>
          <label htmlFor="gk-team">Squadra</label>
          <select
            id="gk-team"
            className="input"
            value={selectedTeam}
            onChange={(e) => setSelectedTeamOverride(e.target.value)}
            disabled={teams.length === 0}
          >
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ width: 300 }}>
          <label htmlFor="gk-file">Sostituisci matrice (CSV o xlsx)</label>
          <input
            id="gk-file"
            className="input"
            style={{ padding: 6 }}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={submitting}>
          {submitting ? "Import…" : "Importa"}
        </button>
      </form>

      {report && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          Squadre: {report.teams} · Coppie: {report.pairs} · Scartate: {report.discarded.length}
        </p>
      )}

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : entries === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : teams.length === 0 ? (
        <StatusMessage kind="empty">Nessuna matrice coppie portieri importata.</StatusMessage>
      ) : (
        <table className="table" style={{ maxWidth: 640 }}>
          <thead>
            <tr>
              <th>Squadra compagna</th>
              <th style={{ width: 220 }}>Favorevolezza</th>
              <th style={{ textAlign: "right" }}>Punteggio</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => {
              const favorable = p.display > maxDisplay * 0.72;
              return (
                <tr key={p.partner}>
                  <td>{p.partner}</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span className="bar-track" style={{ flex: 1, height: 7 }}>
                        <span
                          className="bar-fill"
                          style={{
                            width: `${Math.round((p.display / maxDisplay) * 100)}%`,
                            background: favorable
                              ? "var(--color-accent)"
                              : "var(--color-neutral-500)",
                          }}
                        />
                      </span>
                      <span
                        className="num"
                        style={{ width: 24, textAlign: "right", fontWeight: 600 }}
                      >
                        {p.display}
                      </span>
                    </span>
                  </td>
                  <td
                    className="num"
                    style={{ textAlign: "right", color: "var(--color-neutral-700)" }}
                  >
                    {p.score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
