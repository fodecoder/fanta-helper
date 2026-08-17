import { useState, type FormEvent } from "react";
import type { PlayerImportReport } from "@fanta-helper/shared";
import * as playersApi from "../api/players";
import { PlayersApiError } from "../api/players";
import { StatusMessage } from "../components/StatusMessage";

export function PlayerImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<PlayerImportReport | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setGeneralError("seleziona un file CSV");
      return;
    }

    setGeneralError(null);
    setReport(null);
    setSubmitting(true);
    try {
      const csvText = await file.text();
      const result = await playersApi.importPlayersCsv(csvText);
      setReport(result);
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
    <div className="page">
      <div className="page-header">
        <h1>Import quotazioni</h1>
      </div>

      <section className="card">
        {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

        <form onSubmit={handleSubmit}>
          <label>
            File CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Import in corso…" : "Importa"}
            </button>
          </div>
        </form>

        {report && (
          <div>
            <p>
              Importate: {report.inserted} · Aggiornate: {report.updated} · Scartate:{" "}
              {report.discarded.length}
            </p>
            {report.discarded.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Riga</th>
                      <th>Nome</th>
                      <th>Squadra</th>
                      <th>Ruolo</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.discarded.map((row) => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td>{row.name}</td>
                        <td>{row.team}</td>
                        <td>{row.ruolo}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
