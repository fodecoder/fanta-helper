import { useEffect, useState, type FormEvent } from "react";
import type { League, Manager, ManagerAuctionStatus } from "@fanta-helper/shared";
import * as managersApi from "../api/managers";
import { ManagersApiError } from "../api/managers";
import * as purchasesApi from "../api/purchases";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface ManagersPageProps {
  league: League;
  calls: number | null;
}

export function ManagersPage({ league, calls }: ManagersPageProps) {
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [statuses, setStatuses] = useState<ManagerAuctionStatus[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    managersApi
      .listManagers(league.id, controller.signal)
      .then((data) => {
        setManagers(data);
        setDrafts(Object.fromEntries(data.map((m) => [m.id, m.name])));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento manager fallito");
      });
    void purchasesApi
      .getAuctionState(league.id, controller.signal)
      .then(setStatuses)
      .catch(() => setStatuses(null));
    return () => controller.abort();
  }, [league.id, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);
  const statusFor = (id: number) => statuses?.find((s) => s.managerId === id);
  const boughtFor = (id: number) => statusFor(id)?.slots.reduce((sum, s) => sum + s.used, 0) ?? 0;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (name === "") return;
    setError(null);
    try {
      await managersApi.createManager(league.id, { name });
      setNewName("");
      refresh();
    } catch (err) {
      setError(err instanceof ManagersApiError ? err.payload.error.message : "aggiunta fallita");
    }
  }

  async function commitRename(manager: Manager) {
    const next = (drafts[manager.id] ?? "").trim();
    if (next === "" || next === manager.name) {
      setDrafts((d) => ({ ...d, [manager.id]: manager.name }));
      return;
    }
    setError(null);
    try {
      await managersApi.updateManager(league.id, manager.id, { name: next });
      refresh();
    } catch (err) {
      setError(err instanceof ManagersApiError ? err.payload.error.message : "rinomina fallita");
      setDrafts((d) => ({ ...d, [manager.id]: manager.name }));
    }
  }

  async function handleDelete(manager: Manager) {
    if (boughtFor(manager.id) > 0) return;
    setError(null);
    try {
      await managersApi.deleteManager(league.id, manager.id);
      refresh();
    } catch (err) {
      setError(
        err instanceof ManagersApiError ? err.payload.error.message : "eliminazione fallita",
      );
    }
  }

  return (
    <>
      <PageMasthead
        kicker="Configurazione · partecipanti"
        title="Manager"
        subtitle={
          <>
            {managers?.length ?? 0} partecipanti. Il primo sono io; gli altri sono avversari. Chi ha
            già acquisti nel log non è eliminabile — il log è immutabile e tutto lo stato ne
            discende.
          </>
        }
        calls={calls}
      />

      {error && <StatusMessage kind="error">{error}</StatusMessage>}

      <form
        onSubmit={handleAdd}
        style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 30 }}
      >
        <div className="field" style={{ width: 250 }}>
          <label htmlFor="new-manager">Nuovo manager</label>
          <input
            id="new-manager"
            className="input"
            placeholder="nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Aggiungi
        </button>
      </form>

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : managers === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : (
        <table className="table" style={{ maxWidth: 820 }}>
          <thead>
            <tr>
              <th style={{ width: 230 }}>Nome</th>
              <th style={{ textAlign: "right" }}>Giocatori</th>
              <th style={{ textAlign: "right" }}>Speso</th>
              <th style={{ textAlign: "right" }}>Residuo</th>
              <th>Stato</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => {
              const status = statusFor(m.id);
              const bought = boughtFor(m.id);
              const locked = bought > 0;
              return (
                <tr key={m.id}>
                  <td>
                    <input
                      className="input"
                      style={{ minHeight: 30 }}
                      value={drafts[m.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                      onBlur={() => void commitRename(m)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {bought}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {status?.spent ?? "—"}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {status?.residuo ?? "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                    {locked ? `${bought} acquisti a log` : "eliminabile"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12 }}
                      disabled={locked}
                      onClick={() => void handleDelete(m)}
                    >
                      Elimina
                    </button>
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
