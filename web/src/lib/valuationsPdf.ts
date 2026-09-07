import { ROLES, computeRoleBudget, type Role } from "@fanta-helper/shared";

// Situazione del giocatore per il PDF: NON esiste un campo dedicato nei dati,
// è derivata dai segnali già disponibili (probabile formazione + reliability
// della recommendation). Nessun campo nuovo introdotto.
export type Situazione = "In forma" | "Sottotono" | "Da verificare" | "";

export type LineupStato = "titolare" | "panchina" | "ballottaggio" | null;

export interface ValuationsPdfInputRow {
  playerId: number;
  name: string;
  team: string;
  ruolo: Role;
  tier: string | null;
  // Già in scala display (riscalati per il budget di lega).
  target: number | null;
  maxBid: number | null;
  // Punteggio normalizzato per ruolo, per l'ordinamento e le "scelte top".
  score: number | null;
  reliability: number | null;
  lineupStato: LineupStato;
  dataMissing: boolean;
  needsRoleCheck: boolean;
  note: string | null;
  purchased: boolean;
}

export interface BuildValuationsPdfModelInput {
  leagueName: string;
  budget: number;
  budgetTargetByRole: Record<Role, number>;
  updatedAt: Date;
  rows: ValuationsPdfInputRow[];
}

export interface ValuationsPdfRoleBudget {
  ruolo: Role;
  label: string;
  targetPercent: number;
  targetCredits: number;
  text: string;
}

export interface ValuationsPdfRow {
  index: number;
  name: string;
  team: string;
  tier: string;
  target: string;
  maxBid: string;
  situazione: string;
  acquistatoNote: string;
}

export interface ValuationsPdfSection {
  ruolo: Role;
  label: string;
  count: number;
  title: string;
  topPicks: string;
  rows: ValuationsPdfRow[];
}

export interface ValuationsPdfModel {
  title: string;
  subtitle: string;
  roleBudgets: ValuationsPdfRoleBudget[];
  legend: string[];
  sections: ValuationsPdfSection[];
}

export const NOTE_MAX_LENGTH = 60;

const ROLE_LABELS: Record<Role, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

const ROLE_LABELS_UPPER: Record<Role, string> = {
  P: "PORTIERI",
  D: "DIFENSORI",
  C: "CENTROCAMPISTI",
  A: "ATTACCANTI",
};

function seasonLabel(date: Date): string {
  const year = date.getFullYear();
  // La stagione di Serie A inizia ad agosto: da agosto in poi è {anno}/{anno+1}.
  const startYear = date.getMonth() >= 7 ? year : year - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function truncateNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= NOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, NOTE_MAX_LENGTH - 1).trimEnd()}…`;
}

export function deriveSituazione(row: ValuationsPdfInputRow): Situazione {
  if (row.dataMissing) return "Da verificare";
  if (row.lineupStato === "panchina") return "Sottotono";
  if (row.lineupStato === "ballottaggio") return "Da verificare";
  if (row.lineupStato === "titolare" && (row.reliability ?? 0) >= 0.75) return "In forma";
  if (row.reliability != null && row.reliability > 0 && row.reliability < 0.45) return "Sottotono";
  return "";
}

function amount(value: number | null): string {
  return value == null ? "—" : String(value);
}

function acquistatoNote(row: ValuationsPdfInputRow): string {
  const note = row.note && row.note.trim() !== "" ? truncateNote(row.note) : "";
  if (row.purchased) return note === "" ? "Preso" : `Preso · ${note}`;
  return note;
}

function byScoreDesc(a: ValuationsPdfInputRow, b: ValuationsPdfInputRow): number {
  const av = a.score ?? -Infinity;
  const bv = b.score ?? -Infinity;
  if (av !== bv) return bv - av;
  return a.name.localeCompare(b.name);
}

export function buildValuationsPdfModel(input: BuildValuationsPdfModelInput): ValuationsPdfModel {
  const { leagueName, budget, budgetTargetByRole, updatedAt, rows } = input;

  const roleBudgetStatuses = computeRoleBudget(budget, budgetTargetByRole, {
    P: 0,
    D: 0,
    C: 0,
    A: 0,
  });

  const roleBudgets: ValuationsPdfRoleBudget[] = roleBudgetStatuses.map((s) => ({
    ruolo: s.ruolo,
    label: ROLE_LABELS_UPPER[s.ruolo],
    targetPercent: s.targetPercent,
    targetCredits: s.targetCredits,
    text: `${Math.round(s.targetPercent)}% ${ROLE_LABELS_UPPER[s.ruolo]} · ${s.targetCredits} crediti indicativi`,
  }));

  const sections: ValuationsPdfSection[] = ROLES.map((ruolo) => {
    const roleRows = rows.filter((r) => r.ruolo === ruolo).slice().sort(byScoreDesc);
    const topPicks =
      roleRows.length === 0
        ? "—"
        : roleRows
            .slice(0, 5)
            .map((r) => r.name)
            .join(", ");
    return {
      ruolo,
      label: ROLE_LABELS[ruolo],
      count: roleRows.length,
      title: `${ROLE_LABELS[ruolo]} (${roleRows.length})`,
      topPicks: `Scelte top: ${topPicks}`,
      rows: roleRows.map((r, i) => {
        const situazione = deriveSituazione(r);
        const withCheck = r.needsRoleCheck
          ? situazione === ""
            ? "Verifica ruolo"
            : `${situazione} · Verifica ruolo`
          : situazione;
        return {
          index: i + 1,
          name: r.name,
          team: r.team,
          tier: r.tier ?? "—",
          target: amount(r.target),
          maxBid: amount(r.maxBid),
          situazione: withCheck,
          acquistatoNote: acquistatoNote(r),
        };
      }),
    };
  });

  return {
    title: `Guida Asta Fantacalcio ${seasonLabel(updatedAt)}`,
    subtitle: `${leagueName} · Budget ${budget} crediti · Valutazioni aggiornate al ${formatDate(updatedAt)}`,
    roleBudgets,
    legend: [
      "Target: prezzo obiettivo a cui puntare. Max: tetto di spesa oltre il quale lasciar perdere.",
      "Tier: fascia di valore del giocatore nel ruolo (Top = prima scelta).",
      "Situazione: In forma / Sottotono / Da verificare, dedotta da probabili formazioni e affidabilità del dato.",
      "Verifica ruolo: il ruolo di listino non coincide con quello della tua lista o lo slot non ti serve.",
      "Acquistato · Note: \"Preso\" = giocatore già acquistato; il testo è la tua nota personale (troncata), lo spazio resta per scrivere a mano.",
    ],
    sections,
  };
}

export async function downloadValuationsPdf(
  model: ValuationsPdfModel,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(model.title, margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(model.subtitle, margin, y);
  y += 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  model.roleBudgets.forEach((rb) => {
    doc.text(rb.text, margin, y);
    y += 13;
  });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  model.legend.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2) as string[];
    doc.text(wrapped, margin, y);
    y += wrapped.length * 10;
  });

  y += 8;

  model.sections.forEach((section) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    doc.text(section.title, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const picks = doc.splitTextToSize(section.topPicks, pageWidth - margin * 2) as string[];
    doc.text(picks, margin, y);
    y += picks.length * 10 + 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Giocatore", "Squadra", "Tier", "Target", "Max", "Situazione", "Acquistato · Note"]],
      body: section.rows.map((r) => [
        String(r.index),
        r.name,
        r.team,
        r.tier,
        r.target,
        r.maxBid,
        r.situazione,
        r.acquistatoNote,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [31, 41, 55], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        3: { cellWidth: 44 },
        4: { cellWidth: 40 },
        5: { cellWidth: 40 },
        7: { cellWidth: 120, fontSize: 7 },
      },
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 24;
  });

  doc.save(filename);
}
