import { useState } from "react";

interface WarningBadgeProps {
  warnings: string[];
}

// Emoji lampeggiante accanto al nome di un manager (Io o avversario): su
// mouseover o click mostra un toast con il motivo dell'avviso — max bid
// rettificato superato/slot pieni, quota di reparto, giocatori forti già
// presi da un avversario nel ruolo in chiamata. Nessun avviso, nessun badge.
export function WarningBadge({ warnings }: WarningBadgeProps) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;

  return (
    <span
      className="warning-badge"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="warning-badge__emoji"
        aria-label={`Avviso: ${warnings.join(" · ")}`}
        onClick={(e) => {
          // `userEvent.click` passa prima dal hover (che già apre il toast via
          // `onMouseEnter`): un toggle qui lo richiuderebbe subito. Il click
          // forza sempre aperto; la chiusura resta affidata a mouseleave.
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ⚠️
      </button>
      {open && (
        <span className="warning-badge__toast" role="tooltip">
          {warnings.map((w, i) => (
            <span key={i} className="warning-badge__toast-line">
              {w}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
