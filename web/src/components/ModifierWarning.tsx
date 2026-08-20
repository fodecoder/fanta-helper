import type { ModifiersConfig } from "@fanta-helper/shared";

interface ModifierWarningProps {
  modificatori: ModifiersConfig;
  className?: string;
}

export function ModifierWarning({ modificatori, className }: ModifierWarningProps) {
  const active: string[] = [];
  if (modificatori.portiere.enabled) active.push("portiere");
  if (modificatori.difesa.enabled) active.push("difesa");
  if (active.length === 0) return null;

  const text =
    active.length === 1
      ? `Modificatore ${active[0]} attivo — incide su valutazioni e prezzi.`
      : `Modificatori attivi: ${active.join(" e ")} — incidono su valutazioni e prezzi.`;

  return (
    <p className={`modifier-warning${className ? ` ${className}` : ""}`} role="note">
      {text}
    </p>
  );
}
