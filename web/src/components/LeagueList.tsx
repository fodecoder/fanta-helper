import { useEffect, useState } from "react";
import type { League } from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";

interface LeagueListProps {
  refreshToken: number;
  onCreate: () => void;
  onEdit: (league: League) => void;
  onManageManagers: (league: League) => void;
  onDeleted: () => void;
}

export function LeagueList({
  refreshToken,
  onCreate,
  onEdit,
  onManageManagers,
  onDeleted,
}: LeagueListProps) {
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
    <section>
      <header>
        <h2>Leghe</h2>
        <button type="button" onClick={onCreate}>
          Nuova lega
        </button>
      </header>

      {actionError && <p role="alert">{actionError}</p>}

      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : leagues === null ? (
        <p>Caricamento…</p>
      ) : leagues.length === 0 ? (
        <p>Nessuna lega creata.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Squadre</th>
              <th>Budget</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leagues.map((league) => (
              <tr key={league.id}>
                <td>{league.name}</td>
                <td>{league.n_squadre}</td>
                <td>{league.budget}</td>
                <td>
                  <button type="button" onClick={() => onEdit(league)}>
                    Modifica
                  </button>
                  <button type="button" onClick={() => onManageManagers(league)}>
                    Manager
                  </button>
                  <button type="button" onClick={() => handleDelete(league)}>
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
