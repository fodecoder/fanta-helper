interface ScoutingNoteProps {
  note: string;
  // Evidenza riusando il linguaggio visivo di "Fuori mercato" (accent-2):
  // attiva quando il prezzo corrente porta il verdetto in zona `over`.
  highlighted: boolean;
}

export function ScoutingNote({ note, highlighted }: ScoutingNoteProps) {
  if (!note.trim()) return null;

  return (
    <div
      className={`scouting-note${highlighted ? " scouting-note--over" : ""}`}
      role="note"
      data-testid="scouting-note"
      style={{
        margin: "8px 0 0",
        padding: "8px 12px",
        fontSize: 13,
        lineHeight: 1.4,
        borderLeft: `3px solid ${
          highlighted ? "var(--color-accent-2-700)" : "var(--color-neutral-300)"
        }`,
        background: highlighted
          ? "color-mix(in srgb, var(--color-accent-2-700) 12%, transparent)"
          : "var(--color-neutral-100)",
        color: highlighted ? "var(--color-accent-2-700)" : "var(--color-neutral-800)",
      }}
    >
      {note}
    </div>
  );
}
