import type { QuotationRow, DiscardedReferenceRow } from "@fanta-helper/shared";
import { cell } from "./fileRows";
import { parseNullableInt } from "./numeric";

// Costruisce le righe `quotation` da record già associati a un player_id certo
// (upsert appena eseguito): nessun re-matching. `playerIdFor(i)` restituisce
// undefined per le righe già scartate al passo player — escluse senza doppio
// scarto. Un valore non numerico in Qt.I/Qt.A/FVM è l'unico motivo di scarto
// aggiuntivo qui.
export function quotationRowsFromRecords(
  records: Record<string, string>[],
  playerIdFor: (index: number) => number | undefined,
  season: string,
): { rows: QuotationRow[]; discarded: DiscardedReferenceRow[] } {
  const rows: QuotationRow[] = [];
  const discarded: DiscardedReferenceRow[] = [];

  records.forEach((record, i) => {
    const playerId = playerIdFor(i);
    if (playerId === undefined) return;

    const qtI = parseNullableInt(cell(record["Qt.I"]));
    const qtA = parseNullableInt(cell(record["Qt.A"]));
    const fvm = parseNullableInt(cell(record.FVM));
    if (!qtI.ok || !qtA.ok || !fvm.ok) {
      discarded.push({
        row: i + 1,
        fanta_id: cell(record.Id) || null,
        name: cell(record.Nome),
        team: cell(record.Squadra),
        reason: "valore non numerico in Qt.I/Qt.A/FVM",
      });
      return;
    }

    rows.push({ player_id: playerId, season, qt_i: qtI.value, qt_a: qtA.value, fvm: fvm.value });
  });

  return { rows, discarded };
}
