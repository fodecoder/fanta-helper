import { useEffect, useState } from "react";
import type { Manager } from "@fanta-helper/shared";
import * as managersApi from "../api/managers";

interface ManagerListProps {
  leagueId: number;
  refreshToken: number;
  onCreate: () => void;
  onEdit: (manager: Manager) => void;
  onDeleted: () => void;
}

export function ManagerList({ leagueId, refreshToken, onCreate, onEdit, onDeleted }: ManagerListProps) {
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    managersApi
      .listManagers(leagueId, controller.signal)
      .then((data) => {
        setManagers(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "failed to load managers");
      });
    return () => controller.abort();
  }, [leagueId, refreshToken]);

  async function handleDelete(manager: Manager) {
    const confirmed = window.confirm(`Eliminare il manager "${manager.name}"?`);
    if (!confirmed) return;
    try {
      await managersApi.deleteManager(leagueId, manager.id);
      setActionError(null);
      onDeleted();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "failed to delete manager");
    }
  }

  return (
    <section>
      <header>
        <h2>Manager</h2>
        <button type="button" onClick={onCreate}>
          Nuovo manager
        </button>
      </header>

      {actionError && <p role="alert">{actionError}</p>}

      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : managers === null ? (
        <p>Caricamento…</p>
      ) : managers.length === 0 ? (
        <p>Nessun manager creato.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.id}>
                <td>{manager.name}</td>
                <td>
                  <button type="button" onClick={() => onEdit(manager)}>
                    Modifica
                  </button>
                  <button type="button" onClick={() => handleDelete(manager)}>
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
