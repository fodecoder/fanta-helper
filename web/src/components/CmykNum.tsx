interface CmykNumProps {
  value: number | string;
  className?: string;
}

// Numerale a lastre di processo disallineate (C/M/Y): un .paper con il testo
// reale per l'accessibilità + tre .plate aria-hidden. Puro CSS (vedi index.css),
// nessun runtime: senza il driver di stampa i --press-nx/ny restano a 0.
export function CmykNum({ value, className }: CmykNumProps) {
  const text = String(value);
  return (
    <span className={className ? `cmyk-num ${className}` : "cmyk-num"}>
      <span className="paper">{text}</span>
      <span className="plate plate-c" aria-hidden="true">
        {text}
      </span>
      <span className="plate plate-m" aria-hidden="true">
        {text}
      </span>
      <span className="plate plate-y" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
