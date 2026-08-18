import { useState, type FormEvent } from "react";
import type { GkPairingImportReport } from "@fanta-helper/shared";
import * as gkPairingApi from "../api/gkPairing";
import { GkPairingApiError } from "../api/gkPairing";
import { GkPairingPanel } from "../components/GkPairingPanel";
import { StatusMessage } from "../components/StatusMessage";
import { PageHeader } from "../components/PageHeader";

export function GkPairingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<GkPairingImportReport | null>(null);
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
      const result = await gkPairingApi.importGkPairingFile(file);
      setReport(result);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setGeneralError(
        err instanceof GkPairingApiError
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
      <PageHeader title="Coppie portieri" />

      <section className="card">
        <p>
          File di riferimento (indipendente dalle leghe): matrice squadra×squadra, prima
          riga/colonna con le sigle, celle con il punteggio di favorevolezza della coppia
          (diagonale vuota). Ogni import sostituisce la matrice esistente.
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
            Squadre: {report.teams} · Coppie: {report.pairs} · Scartate:{" "}
            {report.discarded.length}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Matrice attuale</h2>
        <GkPairingPanel refreshToken={refreshToken} />
      </section>
    </div>
  );
}
