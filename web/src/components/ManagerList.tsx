import { useEffect, useState } from "react";
import type { Manager } from "@fanta-helper/shared";
import * as managersApi from "../api/managers";
import { StatusMessage } from "./StatusMessage";

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
    <section className="card">
      <header className="card-header">
        <h2>Manager</h2>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          Nuovo manager
        </button>
      </header>

      {actionError && <StatusMessage kind="error">{actionError}</StatusMessage>}

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : managers === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : managers.length === 0 ? (
        <StatusMessage kind="empty">Nessun manager creato.</StatusMessage>
      ) : (
        <div className="table-wrap">
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
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onEdit(manager)}
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDelete(manager)}
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
