import { useEffect, useState } from "react";
import type { League } from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";
import { StatusMessage } from "./StatusMessage";

interface LeagueListProps {
  refreshToken: number;
  onCreate: () => void;
  onEdit: (league: League) => void;
  onDeleted: () => void;
}

export function LeagueList({ refreshToken, onCreate, onEdit, onDeleted }: LeagueListProps) {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        setLoadError(err instanceof Error ? err.message : "failed to load leagues");
      });
    return () => controller.abort();
  }, [refreshToken]);

  async function handleDelete(league: League) {
    const confirmed = window.confirm(
      `Eliminare la lega "${league.name}"? Verranno eliminati anche manager, valutazioni e acquisti collegati.`,
    );
    if (!confirmed) return;
    try {
      await leaguesApi.deleteLeague(league.id);
      setActionError(null);
      onDeleted();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "failed to delete league");
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>Leghe</h2>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          Nuova lega
        </button>
      </header>

      {actionError && <StatusMessage kind="error">{actionError}</StatusMessage>}

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : leagues === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : leagues.length === 0 ? (
        <StatusMessage kind="empty">Nessuna lega creata.</StatusMessage>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th className="num">Squadre</th>
                <th className="num">Budget</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league) => (
                <tr key={league.id}>
                  <td>{league.name}</td>
                  <td className="num">{league.n_squadre}</td>
                  <td className="num">{league.budget}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onEdit(league)}
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDelete(league)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
