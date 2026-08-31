import type { ReactNode } from "react";

interface PageMastheadProps {
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  calls?: number | null;
  actions?: ReactNode;
}

// Testata di pagina: kicker a sinistra, contatore chiamate a destra, filetto
// grosso+fine, poi h1 e sottotitolo. È l'unico posto (con le tabelle) dove il
// sistema disegna righe.
export function PageMasthead({ kicker, title, subtitle, calls, actions }: PageMastheadProps) {
  return (
    <div className="masthead">
      <div className="masthead-top">
        <span className="masthead-kicker">{kicker}</span>
        {calls != null && <span className="masthead-calls">{calls} chiamate registrate</span>}
      </div>
      <div className="rule-heavy" />
      <div className="rule-thin" />
      {actions ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1>{title}</h1>
          <div style={{ marginLeft: "auto" }}>{actions}</div>
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {subtitle && <p className="masthead-sub">{subtitle}</p>}
    </div>
  );
}
