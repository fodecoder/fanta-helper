import type { ManagerAuctionStatus } from "@fanta-helper/shared";
import { StatusMessage } from "./StatusMessage";

interface AuctionStatusPanelProps {
  statuses: ManagerAuctionStatus[] | null;
  loadError: string | null;
}

export function AuctionStatusPanel({ statuses, loadError }: AuctionStatusPanelProps) {
  return (
    <section className="card">
      <h2>Stato asta</h2>

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : statuses === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : statuses.length === 0 ? (
        <StatusMessage kind="empty">Nessun manager in questa lega.</StatusMessage>
      ) : (
        <div className="table-wrap table-wrap--scroll">
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th className="num">Budget</th>
                <th className="num">Speso</th>
                <th className="num">Residuo</th>
                {statuses[0]?.slots.map((slot) => (
                  <th key={slot.ruolo}>Slot {slot.ruolo}</th>
                ))}
                <th className="num">Max bid rettificato</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => (
                <tr key={status.managerId}>
                  <td>{status.managerName}</td>
                  <td className="num">{status.budget}</td>
                  <td className="num">{status.spent}</td>
                  <td className="num">{status.residuo}</td>
                  {status.slots.map((slot) => (
                    <td key={slot.ruolo} className="num">
                      {slot.used}/{slot.total} (liberi: {slot.free})
                    </td>
                  ))}
                  <td className="num">
                    <strong>{status.adjustedMaxBid}</strong>
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
