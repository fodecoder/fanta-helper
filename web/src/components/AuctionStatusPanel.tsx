import { useEffect, useState } from "react";
import type { ManagerAuctionStatus } from "@fanta-helper/shared";
import * as purchasesApi from "../api/purchases";

interface AuctionStatusPanelProps {
  leagueId: number;
  refreshToken: number;
}

export function AuctionStatusPanel({ leagueId, refreshToken }: AuctionStatusPanelProps) {
  const [statuses, setStatuses] = useState<ManagerAuctionStatus[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    purchasesApi
      .getAuctionState(leagueId, controller.signal)
      .then((data) => {
        setStatuses(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "failed to load auction state");
      });
    return () => controller.abort();
  }, [leagueId, refreshToken]);

  return (
    <section>
      <h2>Stato asta</h2>

      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : statuses === null ? (
        <p>Caricamento…</p>
      ) : statuses.length === 0 ? (
        <p>Nessun manager in questa lega.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Manager</th>
              <th>Budget</th>
              <th>Speso</th>
              <th>Residuo</th>
              {statuses[0]?.slots.map((slot) => (
                <th key={slot.ruolo}>Slot {slot.ruolo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <tr key={status.managerId}>
                <td>{status.managerName}</td>
                <td>{status.budget}</td>
                <td>{status.spent}</td>
                <td>{status.residuo}</td>
                {status.slots.map((slot) => (
                  <td key={slot.ruolo}>
                    {slot.used}/{slot.total} (liberi: {slot.free})
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
