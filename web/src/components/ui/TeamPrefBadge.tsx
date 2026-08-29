interface TeamPrefBadgeProps {
  pref: "prefer" | "avoid" | null;
  variant?: "badge" | "banner" | "dot";
}

// Segnale visivo della preferenza di squadra dell'utente (layer P6): flag di
// sola lettura, non tocca score/valore. `banner` per il giocatore in asta,
// `badge` nelle liste, `dot` dove lo spazio è minimo.
export function TeamPrefBadge({ pref, variant = "badge" }: TeamPrefBadgeProps) {
  if (!pref) return null;
  const label = pref === "avoid" ? "squadra da evitare" : "squadra preferita";

  if (variant === "dot") {
    return <span className={`team-pref-dot team-pref-dot--${pref}`} title={label} aria-label={label} />;
  }
  if (variant === "banner") {
    return (
      <div className={`team-pref-banner team-pref-banner--${pref}`} role="note">
        {pref === "avoid" ? "⚠ " : "★ "}
        {label}
      </div>
    );
  }
  return (
    <span
      className={pref === "avoid" ? "tag tag-neutral" : "tag tag-accent"}
      style={pref === "avoid" ? { color: "var(--color-accent-2-700)" } : undefined}
    >
      {label}
    </span>
  );
}
