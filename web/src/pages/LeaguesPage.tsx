import { useEffect, useState } from "react";
import type { League } from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";
import { LeagueForm } from "../components/LeagueForm";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface LeaguesPageProps {
  calls: number | null;
  activeLeagueId: number | null;
  onLeaguesChanged: () => void;
  onSelectLeague: (id: number | null) => void;
}

export function LeaguesPage({
  calls,
  activeLeagueId,
  onLeaguesChanged,
  onSelectLeague,
}: LeaguesPageProps) {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<League | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // `formKey` rimonta il form quando si passa da crea a modifica (e viceversa)
  // così i campi ripartono dai valori giusti.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    leaguesApi
      .listLeagues(controller.signal)
      .then((data) => {
        setLeagues(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento leghe fallito");
      });
    return () => controller.abort();
  }, [refreshToken]);

  function startEdit(league: League | null) {
    setEditing(league);
    setFormKey((k) => k + 1);
  }

  function handleDelete(league: League) {
    const ok = window.confirm(
      `Eliminare la lega "${league.name}"? Verranno cancellati anche i suoi manager, acquisti e valutazioni.`,
    );
    if (!ok) return;
    setDeletingId(league.id);
    leaguesApi
      .deleteLeague(league.id)
      .then(() => {
        setRefreshToken((t) => t + 1);
        onLeaguesChanged();
        if (league.id === activeLeagueId) onSelectLeague(null);
        if (editing?.id === league.id) startEdit(null);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "eliminazione fallita");
      })
      .finally(() => setDeletingId(null));
  }

  function handleSaved(saved: League, wasCreate: boolean) {
    setRefreshToken((t) => t + 1);
    onLeaguesChanged();
    startEdit(null);
    if (wasCreate) onSelectLeague(saved.id);
  }

  return (
    <>
      <PageMasthead
        kicker="Configurazione · regolamenti"
        title="Leghe"
        subtitle="Ogni asta è una lega con il suo regolamento. Alla creazione parte dai default modificabili e viene popolata con i manager."
        calls={calls}
      />

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : leagues === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : leagues.length === 0 ? (
        <StatusMessage kind="empty">Nessuna lega: creane una qui sotto.</StatusMessage>
      ) : (
        <table className="table" style={{ maxWidth: 820, marginBottom: 44 }}>
          <thead>
            <tr>
              <th>Lega</th>
              <th style={{ textAlign: "right" }}>Squadre</th>
              <th style={{ textAlign: "right" }}>Budget</th>
              <th>Rosa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leagues.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: l.id === activeLeagueId ? 600 : 400 }}>{l.name}</td>
                <td className="num" style={{ textAlign: "right" }}>
                  {l.n_squadre}
                </td>
                <td className="num" style={{ textAlign: "right" }}>
                  {l.budget}
                </td>
                <td>{`${l.roster_config.P}·${l.roster_config.D}·${l.roster_config.C}·${l.roster_config.A}`}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => startEdit(l)}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, color: "var(--color-danger, #e11d48)", marginLeft: 4 }}
                    disabled={deletingId === l.id}
                    onClick={() => handleDelete(l)}
                  >
                    {deletingId === l.id ? "Elimino…" : "Elimina"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <LeagueForm
        key={formKey}
        initial={editing ?? undefined}
        onSaved={(saved) => handleSaved(saved, editing === null)}
        onCancel={() => startEdit(null)}
      />
    </>
  );
}
