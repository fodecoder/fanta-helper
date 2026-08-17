import { useState, type FormEvent } from "react";
import type { GoalkeeperGridImportReport } from "@fanta-helper/shared";
import * as gridApi from "../api/goalkeeperGrid";
import { GoalkeeperGridApiError } from "../api/goalkeeperGrid";
import { GoalkeeperGridTable } from "../components/GoalkeeperGridTable";
import { StatusMessage } from "../components/StatusMessage";
import { PageHeader } from "../components/PageHeader";

export function GoalkeeperGridPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<GoalkeeperGridImportReport | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

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
      const result = await gridApi.importGoalkeeperGridFile(file);
      setReport(result);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setGeneralError(
        err instanceof GoalkeeperGridApiError
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
      <PageHeader title="Griglia portieri" />

      <section className="card">
        <p>
          File di riferimento (indipendente dalle leghe): una riga per squadra, con
          colonne <code>Squadra</code>, <code>Titolare</code>, <code>Riserva</code>,{" "}
          <code>Terzo</code>. Ogni import sostituisce la griglia esistente.
        </p>
        {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

        <form onSubmit={handleSubmit}>
          <label>
            File CSV o xlsx
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
          <p>
            Squadre: {report.teams} · Portieri: {report.entries} · Scartate:{" "}
            {report.discarded.length}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Griglia attuale</h2>
        <GoalkeeperGridTable refreshToken={refreshToken} />
      </section>
    </div>
  );
}
