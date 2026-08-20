import { useEffect, useState, type FormEvent } from "react";
import {
  CONFIDENCE_LEVELS,
  ROLES,
  type Player,
  type UnmatchedValuation,
  type ValuationImport,
  type ValuationImportReport,
} from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import * as playersApi from "../api/players";
import { StatusMessage } from "./StatusMessage";
import { UnmatchedValuationRow } from "./UnmatchedValuationRow";

interface ValuationImportFormProps {
  leagueId: number;
  leagueName: string;
  onResolved: () => void;
}

const SCHEMA_FIELDS: { field: string; type: string; note: string }[] = [
  { field: "name", type: "stringa", note: "usato per il matching nome→giocatore" },
  { field: "team", type: "stringa", note: "disambigua il matching" },
  { field: "ruolo", type: "enum", note: ROLES.join(" / ") },
  { field: "tier", type: "stringa", note: "fascia" },
  { field: "target", type: "intero ≥ 0", note: "prezzo obiettivo" },
  { field: "fair_value", type: "intero ≥ 0", note: "valore equo" },
  { field: "max_bid", type: "intero ≥ 0", note: "rilancio massimo suggerito" },
  { field: "panic_price", type: "intero ≥ 0", note: "soglia oltre cui non inseguire" },
  { field: "confidence", type: "enum", note: CONFIDENCE_LEVELS.join(" / ") },
  { field: "note", type: "stringa o null", note: "opzionale" },
];

function buildExampleDoc(leagueName: string): ValuationImport {
  return {
    league_name: leagueName,
    generated_at: new Date().toISOString(),
    players: ROLES.map((ruolo, index) => ({
      name: `Esempio ${ruolo}`,
      team: "Squadra Esempio",
      ruolo,
      tier: "A",
      target: 10 + index,
      fair_value: 10 + index,
      max_bid: 15 + index,
      panic_price: 20 + index,
      confidence: CONFIDENCE_LEVELS[index % CONFIDENCE_LEVELS.length]!,
      note: null,
    })),
  };
}

function downloadTemplate(leagueName: string) {
  const blob = new Blob([JSON.stringify(buildExampleDoc(leagueName), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "valutazioni-esempio.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function ValuationImportForm({ leagueId, leagueName, onResolved }: ValuationImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ValuationImportReport | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedValuation[]>([]);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unmatched.length === 0 || players !== null) return;
    const controller = new AbortController();
    playersApi
      .listPlayers(controller.signal)
      .then(setPlayers)
      .catch(() => setPlayers([]));
    return () => controller.abort();
  }, [unmatched.length, players]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setGeneralError("seleziona un file JSON");
      return;
    }

    setGeneralError(null);
    setReport(null);
    setUnmatched([]);
    setSubmitting(true);
    try {
      const text = await file.text();
      let doc: unknown;
      try {
        doc = JSON.parse(text);
      } catch {
        setGeneralError("il file non è un JSON valido");
        return;
      }
      const result = await valuationsApi.importValuationsJson(leagueId, doc);
      setReport(result);
      setUnmatched(result.unmatched);
      onResolved();
    } catch (err) {
      setGeneralError(
        err instanceof ValuationsApiError ? err.payload.error.message : "import fallito",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <details open style={{ marginBottom: 14 }}>
        <summary style={{ cursor: "pointer", font: "600 15px/1 var(--font-heading)" }}>
          Formato JSON atteso
        </summary>
        <div style={{ marginTop: 10 }}>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Documento radice: <code>league_name</code> (stringa), <code>generated_at</code> (data
            ISO 8601), <code>players</code> (array di almeno un elemento con i campi seguenti).
          </p>
          <div className="table-scroll">
            <table className="table" style={{ maxWidth: 640 }}>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {SCHEMA_FIELDS.map((row) => (
                  <tr key={row.field}>
                    <td>
                      <code>{row.field}</code>
                    </td>
                    <td>{row.type}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => downloadTemplate(leagueName)}
          >
            Scarica template JSON
          </button>
        </div>
      </details>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
      >
        <div className="field" style={{ width: 320 }}>
          <label htmlFor="valuations-json">Importa JSON</label>
          <input
            id="valuations-json"
            className="input"
            style={{ padding: 6 }}
            type="file"
            accept=".json,application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={submitting}>
          {submitting ? "Import in corso…" : "Importa JSON"}
        </button>
      </form>

      {report && (
        <p className="text-muted" style={{ fontSize: 13, marginTop: 10 }}>
          Importate: {report.imported} · Aggiornate: {report.updated} · Scartate:{" "}
          {report.discarded.length} · Unmatched: {unmatched.length}
        </p>
      )}

      {report && report.discarded.length > 0 && (
        <div className="table-scroll">
          <table className="table" style={{ maxWidth: 760 }}>
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
                  <td>{row.name ?? "—"}</td>
                  <td>{row.team ?? "—"}</td>
                  <td>{row.ruolo ?? "—"}</td>
                  <td style={{ color: "var(--color-accent-2-700)", fontSize: 13 }}>
                    {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="table-scroll">
          <table className="table" style={{ maxWidth: 760 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Tier</th>
                <th>Motivo</th>
                <th>Assegna a</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unmatched.map((entry, index) => (
                <UnmatchedValuationRow
                  key={`${entry.name}-${entry.team}-${index}`}
                  leagueId={leagueId}
                  entry={entry}
                  players={players ?? []}
                  onAssigned={() => {
                    setUnmatched((rows) => rows.filter((_, i) => i !== index));
                    onResolved();
                  }}
                  onDiscarded={() => setUnmatched((rows) => rows.filter((_, i) => i !== index))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
