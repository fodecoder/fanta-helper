import path from "node:path";
import { resolveDocsDir } from "../scripts/docsPath";

// Le due dataset di base coprono solo lega da 8 e da 10 squadre: sono numeri
// derivati appositamente per quella dimensione (scarsità diversa, non un
// riscalaggio lineare), quindi per qualsiasi altro n_squadre non si applica
// nessun default piuttosto che indovinare un bucket più vicino.
const DEFAULT_FILES: Record<number, string> = {
  8: "asta_1000_lega8.json",
  10: "asta_1000_lega10.json",
};

export function resolveDefaultValuationsFile(nSquadre: number): string | null {
  const filename = DEFAULT_FILES[nSquadre];
  if (!filename) return null;
  return path.join(resolveDocsDir(), "sample", filename);
}
