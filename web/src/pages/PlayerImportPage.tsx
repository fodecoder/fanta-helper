import { useState, type FormEvent } from "react";
import type { PlayerImportReport } from "@fanta-helper/shared";
import * as playersApi from "../api/players";
import { PlayersApiError } from "../api/players";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface PlayerImportPageProps {
  calls: number | null;
}

export function PlayerImportPage({ calls }: PlayerImportPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<PlayerImportReport | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setGeneralError("seleziona un file CSV o xlsx");
      return;
    }
    setGeneralError(null);
    setReport(null);
    setSubmitting(true);
    try {
      setReport(await playersApi.importPlayersFile(file));
    } catch (err) {
      setGeneralError(
        err instanceof PlayersApiError
          ? err.payload.error.message
          : err instanceof Error
            ? err.message
            : "import fallito",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMasthead
        kicker="Riferimento globale · listino Fantacalcio"
        title="Quotazioni"
        subtitle="Listino ufficiale in CSV o xlsx, indipendente dalle leghe. Le righe già presenti vengono aggiornate; quelle non interpretabili sono scartate e mostrate qui sotto, mai indovinate."
        calls={calls}
      />

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          marginBottom: 34,
          flexWrap: "wrap",
        }}
      >
        <div className="field" style={{ width: 320 }}>
          <label htmlFor="quotes-file">File CSV o xlsx</label>
          <input
            id="quotes-file"
            className="input"
            style={{ padding: 6 }}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Import in corso…" : "Importa"}
        </button>
      </form>

      {report && (
        <div>
          <div style={{ display: "flex", gap: 44, marginBottom: 26 }}>
            <ReportFigure label="Importate" value={report.inserted} />
            <ReportFigure label="Aggiornate" value={report.updated} />
            <ReportFigure label="Scartate" value={report.discarded.length} warn />
          </div>
          {report.discarded.length > 0 && (
            <table className="table" style={{ maxWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>Riga</th>
                  <th>Nome</th>
                  <th>Squadra</th>
                  <th>Ruolo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {report.discarded.map((row) => (
                  <tr key={row.row}>
                    <td className="num" style={{ textAlign: "right" }}>
                      {row.row}
                    </td>
                    <td>{row.name === "" ? "—" : row.name}</td>
                    <td>{row.team}</td>
                    <td>{row.ruolo}</td>
                    <td style={{ color: "var(--color-accent-2-700)", fontSize: 13 }}>
                      {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
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
