import type { ManagerAuctionStatus } from "@fanta-helper/shared";

interface AuctionStatusPanelProps {
  statuses: ManagerAuctionStatus[] | null;
  loadError: string | null;
}

export function AuctionStatusPanel({ statuses, loadError }: AuctionStatusPanelProps) {
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
              <th>Max bid rettificato</th>
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
                <td>{status.adjustedMaxBid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
