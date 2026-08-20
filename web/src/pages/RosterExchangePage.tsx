import { useRef, useState } from "react";
import type { League, RosterExportResult, RosterImportReport } from "@fanta-helper/shared";
import * as rosterExchangeApi from "../api/rosterExchange";
import { RosterExchangeApiError } from "../api/rosterExchange";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface RosterExchangePageProps {
  league: League;
  calls: number | null;
}

export function RosterExchangePage({ league, calls }: RosterExchangePageProps) {
  const [exportResult, setExportResult] = useState<RosterExportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<RosterImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function errorMessage(err: unknown): string {
    return err instanceof RosterExchangeApiError
      ? err.payload.error.message
      : err instanceof Error
        ? err.message
        : "operazione fallita";
  }

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      const result = await rosterExchangeApi.exportRoster(league.id);
      setExportResult(result);
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rose-${league.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!file) {
      setImportError("seleziona un file CSV");
      return;
    }
    setImportError(null);
    setImportReport(null);
    setImporting(true);
    try {
      const csvText = await file.text();
      setImportReport(await rosterExchangeApi.importRosterCsv(league.id, csvText));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <PageMasthead
        kicker={`Lega · ${league.name}`}
        title="Rose · export/import"
        subtitle="Interscambio con il gestionale ufficiale della lega: CSV a blocchi, tre colonne (squadra, fanta_id, prezzo)."
        calls={calls}
      />

      <section style={{ marginBottom: 44 }}>
        <h2 style={{ marginBottom: 10 }}>Esporta rose</h2>
        <p style={{ marginBottom: 14, color: "var(--color-neutral-700)" }}>
          Genera il CSV delle rose correnti, derivato dal log acquisti di questa lega.
        </p>
        {exportError && <StatusMessage kind="error">{exportError}</StatusMessage>}
        <button type="button" className="btn btn-primary" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? "Esportazione in corso…" : "Esporta rose (CSV)"}
        </button>

        {exportResult && exportResult.unresolved.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <StatusMessage kind="error">
              {exportResult.unresolved.length} giocatori acquistati non hanno un fanta_id mappato e
              non sono presenti nel CSV scaricato.
            </StatusMessage>
            <table className="table" style={{ maxWidth: 720, marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Giocatore</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {exportResult.unresolved.map((row, i) => (
                  <tr key={`${row.playerId}-${i}`}>
                    <td>{row.managerName}</td>
                    <td>{row.playerName}</td>
                    <td style={{ color: "var(--color-accent-2-700)", fontSize: 13 }}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: 10 }}>Importa rose</h2>
        <StatusMessage kind="error">
          Attenzione: l'import sostituisce interamente la rosa corrente di questa lega. Il log
          acquisti esistente viene svuotato e ricostruito dal contenuto del file.
        </StatusMessage>

        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-end",
            margin: "18px 0",
            flexWrap: "wrap",
          }}
        >
          <div className="field" style={{ width: 320 }}>
            <label htmlFor="roster-file">File CSV</label>
            <input
              id="roster-file"
              ref={fileInputRef}
              className="input"
              style={{ padding: 6 }}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleImport()}
            disabled={importing}
          >
            {importing ? "Import in corso…" : "Sostituisci rose da CSV"}
          </button>
        </div>

        {importError && <StatusMessage kind="error">{importError}</StatusMessage>}

        {importReport && (
          <div>
            <div style={{ display: "flex", gap: 44, marginBottom: 26 }}>
              <ReportFigure label="Importate" value={importReport.imported} />
              <ReportFigure label="Scartate" value={importReport.discarded.length} warn />
              <ReportFigure label="Manager sconosciuti" value={importReport.unknownManagers.length} warn />
            </div>

            {importReport.unknownManagers.length > 0 && (
              <p style={{ marginBottom: 18, color: "var(--color-accent-2-700)" }}>
                Manager non trovati nella lega: {importReport.unknownManagers.join(", ")}
              </p>
            )}

            {importReport.discarded.length > 0 && (
              <table className="table" style={{ maxWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "right" }}>Riga</th>
                    <th>Manager</th>
                    <th>Fanta ID</th>
                    <th>Prezzo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {importReport.discarded.map((row) => (
                    <tr key={row.row}>
                      <td className="num" style={{ textAlign: "right" }}>
                        {row.row}
                      </td>
                      <td>{row.managerName === "" ? "—" : row.managerName}</td>
                      <td>{row.fantaId === "" ? "—" : row.fantaId}</td>
                      <td>{row.prezzo === "" ? "—" : row.prezzo}</td>
                      <td style={{ color: "var(--color-accent-2-700)", fontSize: 13 }}>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function ReportFigure({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div
        className="num"
        style={{
          font: "600 34px/1 var(--font-heading)",
          color: warn ? "var(--color-accent-2-700)" : undefined,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--color-neutral-700)",
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  );
}
