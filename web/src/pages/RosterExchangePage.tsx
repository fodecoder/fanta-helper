import { useEffect, useRef, useState } from "react";
import type {
  League,
  Manager,
  RosterExportResult,
  RosterImportPreviewResult,
  RosterImportReport,
} from "@fanta-helper/shared";
import { listManagers } from "../api/managers";
import * as rosterExchangeApi from "../api/rosterExchange";
import { RosterExchangeApiError } from "../api/rosterExchange";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface RosterExchangePageProps {
  league: League;
  calls: number | null;
}

type ImportPhase = "idle" | "preview" | "report";

export function RosterExchangePage({ league, calls }: RosterExchangePageProps) {
  const [exportResult, setExportResult] = useState<RosterExportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [managers, setManagers] = useState<Manager[]>([]);

  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<RosterImportPreviewResult | null>(null);
  // csvTeamName → managerId scelto ("" = non ancora scelto). Deriva l'unica
  // fonte di verità del mapping inviato al commit.
  const [mapping, setMapping] = useState<Record<string, number | "">>({});
  const [importReport, setImportReport] = useState<RosterImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    listManagers(league.id, ctrl.signal)
      .then(setManagers)
      .catch(() => {
        if (!ctrl.signal.aborted) setManagers([]);
      });
    return () => ctrl.abort();
  }, [league.id]);

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

  function resetImport() {
    setPhase("idle");
    setCsv("");
    setPreview(null);
    setMapping({});
    setImportReport(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(file: File | null) {
    setImportError(null);
    setImportReport(null);
    setPreview(null);
    setMapping({});
    if (!file) {
      setPhase("idle");
      setCsv("");
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const result = await rosterExchangeApi.previewRosterImportCsv(league.id, text);
      setCsv(text);
      setPreview(result);
      setMapping(
        Object.fromEntries(
          result.blocks.map((b) => [b.csvTeamName, b.suggestedManagerId ?? ""]),
        ),
      );
      setPhase("preview");
    } catch (err) {
      setImportError(errorMessage(err));
      setPhase("idle");
    } finally {
      setImporting(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setImportError(null);
    setImporting(true);
    try {
      const entries = Object.entries(mapping).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      );
      const report = await rosterExchangeApi.commitRosterImport(league.id, {
        csv,
        mapping: Object.fromEntries(entries),
      });
      setImportReport(report);
      setPhase("report");
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  const blocks = preview?.blocks ?? [];
  const missingSelection = blocks.some((b) => mapping[b.csvTeamName] === "" || mapping[b.csvTeamName] === undefined);
  const duplicateManagerIds = new Set<number>();
  {
    const seen = new Set<number>();
    for (const b of blocks) {
      const id = mapping[b.csvTeamName];
      if (typeof id !== "number") continue;
      if (seen.has(id)) duplicateManagerIds.add(id);
      seen.add(id);
    }
  }
  const hasDuplicate = duplicateManagerIds.size > 0;

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
              disabled={importing}
              onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
            />
          </div>
          {phase !== "idle" && (
            <button type="button" className="btn" onClick={resetImport} disabled={importing}>
              Ricomincia
            </button>
          )}
        </div>

        {importError && <StatusMessage kind="error">{importError}</StatusMessage>}

        {phase === "preview" && preview && (
          <div>
            <p style={{ marginBottom: 12, color: "var(--color-neutral-700)" }}>
              Associa ogni blocco del CSV a un manager della lega. Il suggerimento è precompilato per
              somiglianza di nome: correggilo dove serve. Ogni manager può ricevere un solo blocco.
            </p>

            {blocks.length === 0 && (
              <StatusMessage kind="error">Nessun blocco trovato nel file.</StatusMessage>
            )}

            {hasDuplicate && (
              <StatusMessage kind="error">
                Un manager è associato a più di un blocco: correggi le selezioni evidenziate.
              </StatusMessage>
            )}

            {blocks.length > 0 && (
              <table className="table" style={{ maxWidth: 820, marginTop: 6 }}>
                <thead>
                  <tr>
                    <th>Squadra CSV</th>
                    <th style={{ textAlign: "right" }}>Righe</th>
                    <th>Manager di lega</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => {
                    const selected = mapping[block.csvTeamName] ?? "";
                    const isDup = typeof selected === "number" && duplicateManagerIds.has(selected);
                    return (
                      <tr key={block.csvTeamName}>
                        <td>{block.csvTeamName === "" ? "—" : block.csvTeamName}</td>
                        <td className="num" style={{ textAlign: "right" }}>
                          {block.rowCount}
                        </td>
                        <td>
                          <select
                            className="input"
                            style={{
                              padding: 6,
                              borderColor: isDup ? "var(--color-accent-2-700)" : undefined,
                            }}
                            value={selected === "" ? "" : String(selected)}
                            onChange={(e) =>
                              setMapping((prev) => ({
                                ...prev,
                                [block.csvTeamName]:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                          >
                            <option value="">— scegli —</option>
                            {managers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => void handleCommit()}
              disabled={importing || blocks.length === 0 || missingSelection || hasDuplicate}
            >
              {importing ? "Import in corso…" : "Conferma import"}
            </button>
          </div>
        )}

        {phase === "report" && importReport && (
          <div>
            <div style={{ display: "flex", gap: 44, marginBottom: 26 }}>
              <ReportFigure label="Importate" value={importReport.imported} />
              <ReportFigure label="Scartate" value={importReport.discarded.length} warn />
              <ReportFigure label="Blocchi non mappati" value={importReport.unknownManagers.length} warn />
            </div>

            {importReport.unknownManagers.length > 0 && (
              <p style={{ marginBottom: 18, color: "var(--color-accent-2-700)" }}>
                Blocchi CSV senza manager associato: {importReport.unknownManagers.join(", ")}
              </p>
            )}

            {importReport.discarded.length > 0 && (
              <table className="table" style={{ maxWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "right" }}>Riga</th>
                    <th>Squadra CSV</th>
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
