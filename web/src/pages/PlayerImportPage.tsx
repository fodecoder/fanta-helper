import { useState, type FormEvent } from "react";
import type { PlayerImportReport } from "@fanta-helper/shared";
import * as playersApi from "../api/players";
import { PlayersApiError } from "../api/players";

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
    <section>
      <h2>Import quotazioni</h2>

      {generalError && <p role="alert">{generalError}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          File CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div>
          <button type="submit" disabled={submitting}>
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
          )}
        </div>
      )}
    </section>
  );
}
