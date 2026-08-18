import type { ReactNode } from "react";

interface PageMastheadProps {
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  calls?: number | null;
}

// Testata di pagina: kicker a sinistra, contatore chiamate a destra, filetto
// grosso+fine, poi h1 e sottotitolo. È l'unico posto (con le tabelle) dove il
// sistema disegna righe.
export function PageMasthead({ kicker, title, subtitle, calls }: PageMastheadProps) {
  return (
    <div className="masthead">
      <div className="masthead-top">
        <span className="masthead-kicker">{kicker}</span>
        {calls != null && <span className="masthead-calls">{calls} chiamate registrate</span>}
      </div>
      <div className="rule-heavy" />
      <div className="rule-thin" />
      <h1>{title}</h1>
      {subtitle && <p className="masthead-sub">{subtitle}</p>}
    </div>
  );
}
