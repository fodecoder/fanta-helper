interface InfoLabelProps {
  label: string;
  tooltip: string;
  // Se passato, mostra un pulsante «ⓘ» che apre lo scomposto (colonne calcolate).
  onDetails?: () => void;
}

// Etichetta di colonna con tooltip nativo (`abbr` + `title`, accessibile e su
// hover) e, per le colonne calcolate, un pulsante che apre il modale dettagli.
export function InfoLabel({ label, tooltip, onDetails }: InfoLabelProps) {
  return (
    <span className="info-label">
      <abbr title={tooltip}>{label}</abbr>
      {onDetails && (
        <button
          type="button"
          className="info-label__more"
          onClick={onDetails}
          title="Dettagli del calcolo"
          aria-label={`Dettagli del calcolo: ${label}`}
        >
          ⓘ
        </button>
      )}
    </span>
  );
}
