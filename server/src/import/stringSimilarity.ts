// Coefficiente di Sørensen–Dice sui bigrammi di caratteri, normalizzato
// lowercase/trim. Nessuna dipendenza esterna: serve solo a proporre un
// pre-fill del mapping nome-squadra → manager nell'import rose, non è un match
// vincolante. Stringhe con meno di 2 caratteri: 1 se identiche dopo normalizza-
// zione, 0 altrimenti.
export function diceCoefficient(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < x.length - 1; i += 1) {
    const bg = x.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < y.length - 1; i += 1) {
    const bg = y.slice(i, i + 2);
    const count = bigrams.get(bg) ?? 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (x.length - 1 + (y.length - 1));
}
