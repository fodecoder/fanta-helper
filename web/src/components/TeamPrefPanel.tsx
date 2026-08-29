import { useMemo, useState } from "react";
import type { TeamPref, TeamPrefKind } from "@fanta-helper/shared";
import * as teamPrefsApi from "../api/teamPrefs";
import { TeamPrefsApiError } from "../api/teamPrefs";

interface TeamPrefPanelProps {
  leagueId: number;
  teams: string[];
  prefs: TeamPref[];
  onChanged: () => void;
}

// Pannello di gestione preferenze squadra: flag + ordinamento secondario a
// parità di fascia (il riordino è server-side, qui si scrive soltanto). Non
// tocca lo score di base.
export function TeamPrefPanel({ leagueId, teams, prefs, onChanged }: TeamPrefPanelProps) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byKind = useMemo(() => {
    const prefer = prefs.filter((p) => p.kind === "prefer").map((p) => p.team);
    const avoid = prefs.filter((p) => p.kind === "avoid").map((p) => p.team);
    return { prefer, avoid };
  }, [prefs]);

  const assigned = new Set(prefs.map((p) => p.team));
  const available = teams.filter((t) => !assigned.has(t)).sort((a, b) => a.localeCompare(b));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof TeamPrefsApiError ? err.payload.error.message : "operazione fallita");
    } finally {
      setBusy(false);
    }
  }

  function add(kind: TeamPrefKind) {
    if (selected === "") return;
    const team = selected;
    setSelected("");
    void run(() => teamPrefsApi.upsertTeamPref(leagueId, team, kind));
  }

  function remove(team: string) {
    void run(() => teamPrefsApi.deleteTeamPref(leagueId, team));
  }

  const chip = (team: string, tone: "accent" | "neutral") => (
    <button
      key={team}
      type="button"
      className={`tag tag-${tone}`}
      style={{ marginRight: 6, marginBottom: 4, cursor: "pointer" }}
      disabled={busy}
      onClick={() => remove(team)}
      title="rimuovi"
    >
      {team} ✕
    </button>
  );

  return (
    <div
      style={{
        padding: 14,
        margin: "16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: "1px solid var(--color-neutral-300)",
        borderRadius: 8,
        background: "var(--color-surface)",
      }}
    >
      <strong style={{ fontSize: 13 }}>Preferenze squadra</strong>
      <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
        A parità di fascia, le squadre preferite salgono in lista e quelle da evitare vengono
        demote e segnalate. Il punteggio non cambia.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          className="input"
          style={{ width: 200 }}
          value={selected}
          disabled={busy || available.length === 0}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— seleziona squadra —</option>
          {available.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || selected === ""}
          onClick={() => add("prefer")}
        >
          Preferita
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || selected === ""}
          onClick={() => add("avoid")}
        >
          Da evitare
        </button>
      </div>

      <div style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--color-neutral-700)" }}>Preferite:</span>{" "}
          {byKind.prefer.length === 0 ? "—" : byKind.prefer.map((t) => chip(t, "accent"))}
        </div>
        <div>
          <span style={{ color: "var(--color-neutral-700)" }}>Da evitare:</span>{" "}
          {byKind.avoid.length === 0 ? "—" : byKind.avoid.map((t) => chip(t, "neutral"))}
        </div>
      </div>

      {error && (
        <span style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>{error}</span>
      )}
    </div>
  );
}
