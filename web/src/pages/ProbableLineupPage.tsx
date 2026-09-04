import { useMemo, useState } from "react";
import type { ProbableLineupStato, SetPieceTakerTipo } from "@fanta-helper/shared";
import {
  PROBABLE_LINEUP_STATI,
  SET_PIECE_TAKER_TIPI,
  probableFormationImportInputSchema,
  normalizeProbableFormationInput,
  toProbableLineupEntries,
  toSetPieceTakerEntries,
} from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import { ProbableLineupApiError } from "../api/probableLineup";
import * as setPieceTakerApi from "../api/setPieceTaker";
import { SetPieceTakerApiError } from "../api/setPieceTaker";
import { ProbableLineupBoard } from "../components/ProbableLineupBoard";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface ProbableLineupPageProps {
  calls: number | null;
}

interface DraftRow {
  player_name: string;
  ruolo: string | null;
  stato: ProbableLineupStato;
  excluded: boolean;
}

interface SetPieceDraftRow {
  tipo: SetPieceTakerTipo;
  player_name: string;
  rank: number;
  excluded: boolean;
}

interface TeamDraft {
  team: string;
  lineupRows: DraftRow[];
  setPieceRows: SetPieceDraftRow[];
}

const EXAMPLE_JSON = `{
  "team": "Atalanta",
  "titolari": [
    { "player_name": "Carnesecchi", "ruolo": "P" },
    { "player_name": "Toloi", "ruolo": "D" }
  ],
  "ballottaggi": [
    { "ruolo": "D", "opzioni": ["Bernasconi", "Kolasinac"] }
  ],
  "rigoristi": ["Kessié", "Scamacca", "Krstovic"],
  "punizioni": ["Gaetano", "Samardzic", "De Ketelaere"]
}`;

function nextRank(rows: SetPieceDraftRow[], tipo: SetPieceTakerTipo): number {
  const max = rows.filter((r) => r.tipo === tipo).reduce((m, r) => Math.max(m, r.rank), 0);
  return max + 1;
}

export function ProbableLineupPage({ calls }: ProbableLineupPageProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [teamDrafts, setTeamDrafts] = useState<TeamDraft[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmReport, setConfirmReport] = useState<string[] | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const hasDrafts = useMemo(() => (teamDrafts?.length ?? 0) > 0, [teamDrafts]);

  function handleLoad() {
    setConfirmReport(null);
    setParseError(null);
    let raw: unknown;
    try {
      raw = JSON.parse(jsonText);
    } catch {
      setTeamDrafts(null);
      return setParseError("JSON non valido: controlla la sintassi");
    }
    const result = probableFormationImportInputSchema.safeParse(raw);
    if (!result.success) {
      setTeamDrafts(null);
      return setParseError(
        `formato non atteso: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      );
    }
    const teams = normalizeProbableFormationInput(result.data);
    setTeamDrafts(
      teams.map((input) => ({
        team: input.team,
        lineupRows: toProbableLineupEntries(input).map((e) => ({ ...e, excluded: false })),
        setPieceRows: toSetPieceTakerEntries(input).map((e) => ({ ...e, excluded: false })),
      })),
    );
  }

  function updateTeam(index: number, patch: Partial<TeamDraft>) {
    setTeamDrafts((drafts) => drafts?.map((d, i) => (i === index ? { ...d, ...patch } : d)) ?? null);
  }

  function updateLineupRow(teamIndex: number, rowIndex: number, patch: Partial<DraftRow>) {
    setTeamDrafts(
      (drafts) =>
        drafts?.map((d, i) =>
          i !== teamIndex
            ? d
            : {
                ...d,
                lineupRows: d.lineupRows.map((row, j) => (j === rowIndex ? { ...row, ...patch } : row)),
              },
        ) ?? null,
    );
  }

  function updateSetPieceRow(teamIndex: number, rowIndex: number, patch: Partial<SetPieceDraftRow>) {
    setTeamDrafts(
      (drafts) =>
        drafts?.map((d, i) =>
          i !== teamIndex
            ? d
            : {
                ...d,
                setPieceRows: d.setPieceRows.map((row, j) =>
                  j === rowIndex ? { ...row, ...patch } : row,
                ),
              },
        ) ?? null,
    );
  }

  function addLineupRow(teamIndex: number) {
    const draft = teamDrafts?.[teamIndex];
    if (!draft) return;
    updateTeam(teamIndex, {
      lineupRows: [...draft.lineupRows, { player_name: "", ruolo: null, stato: "titolare", excluded: false }],
    });
  }

  function addSetPieceRow(teamIndex: number, tipo: SetPieceTakerTipo) {
    const draft = teamDrafts?.[teamIndex];
    if (!draft) return;
    updateTeam(teamIndex, {
      setPieceRows: [
        ...draft.setPieceRows,
        { tipo, player_name: "", rank: nextRank(draft.setPieceRows, tipo), excluded: false },
      ],
    });
  }

  async function handleConfirmAll() {
    if (!teamDrafts) return;
    setConfirming(true);
    setConfirmReport(null);
    const report: string[] = [];
    for (const draft of teamDrafts) {
      const lineupEntries = draft.lineupRows
        .filter((r) => !r.excluded && r.player_name.trim() !== "")
        .map((r) => ({ player_name: r.player_name.trim(), ruolo: r.ruolo, stato: r.stato }));
      const setPieceEntries = draft.setPieceRows
        .filter((r) => !r.excluded && r.player_name.trim() !== "")
        .map((r) => ({ tipo: r.tipo, player_name: r.player_name.trim(), rank: r.rank }));

      if (lineupEntries.length > 0) {
        try {
          const res = await lineupApi.confirmProbableLineup(draft.team, lineupEntries);
          report.push(`${draft.team}: formazione salvata (${res.entries} giocatori)`);
        } catch (err) {
          report.push(
            `${draft.team}: formazione NON salvata — ${
              err instanceof ProbableLineupApiError
                ? err.payload.error.message
                : err instanceof Error
                  ? err.message
                  : "errore sconosciuto"
            }`,
          );
        }
      }
      if (setPieceEntries.length > 0) {
        try {
          const res = await setPieceTakerApi.confirmSetPieceTakers(draft.team, setPieceEntries);
          report.push(`${draft.team}: calci piazzati salvati (${res.entries} righe)`);
        } catch (err) {
          report.push(
            `${draft.team}: calci piazzati NON salvati — ${
              err instanceof SetPieceTakerApiError
                ? err.payload.error.message
                : err instanceof Error
                  ? err.message
                  : "errore sconosciuto"
            }`,
          );
        }
      }
    }
    setConfirmReport(report);
    setConfirming(false);
    setRefreshToken((t) => t + 1);
  }

  return (
    <>
      <PageMasthead
        kicker="Riferimento globale · undici probabili"
        title="Probabili formazioni"
        subtitle="Import JSON (una squadra o tutte insieme) → revisione manuale → conferma. Ogni conferma sostituisce solo i dati delle squadre incluse nel file, per quella sola squadra."
        calls={calls}
      />

      {parseError && <StatusMessage kind="error">{parseError}</StatusMessage>}
      {confirmReport && (
        <StatusMessage kind="empty">
          {confirmReport.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </StatusMessage>
      )}

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="pf-json">JSON (singola squadra o array di squadre)</label>
        <textarea
          id="pf-json"
          className="input"
          style={{ minHeight: 160, fontFamily: "monospace", fontSize: 12 }}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={EXAMPLE_JSON}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 34 }}>
        <button type="button" className="btn btn-primary" onClick={handleLoad} disabled={jsonText.trim() === ""}>
          Carica
        </button>
        {hasDrafts && (
          <button type="button" className="btn btn-primary" onClick={() => void handleConfirmAll()} disabled={confirming}>
            {confirming ? "Conferma…" : `Conferma tutto (${teamDrafts!.length} squadr${teamDrafts!.length === 1 ? "a" : "e"})`}
          </button>
        )}
      </div>

      {hasDrafts &&
        teamDrafts!.map((draft, teamIndex) => (
          <div key={`${draft.team}-${teamIndex}`} style={{ marginBottom: 40 }}>
            <h3 style={{ margin: "0 0 10px" }}>{draft.team}</h3>

            <table className="table" style={{ maxWidth: 720, marginBottom: 10 }}>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th style={{ width: 90 }}>Ruolo</th>
                  <th style={{ width: 150 }}>Stato</th>
                  <th style={{ width: 80 }}>Escludi</th>
                </tr>
              </thead>
              <tbody>
                {draft.lineupRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      <input
                        className="input"
                        style={{ minHeight: 28 }}
                        value={row.player_name}
                        onChange={(e) => updateLineupRow(teamIndex, rowIndex, { player_name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ minHeight: 28 }}
                        value={row.ruolo ?? ""}
                        onChange={(e) => updateLineupRow(teamIndex, rowIndex, { ruolo: e.target.value || null })}
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ minHeight: 28 }}
                        value={row.stato}
                        onChange={(e) =>
                          updateLineupRow(teamIndex, rowIndex, { stato: e.target.value as ProbableLineupStato })
                        }
                      >
                        {PROBABLE_LINEUP_STATI.map((stato) => (
                          <option key={stato} value={stato}>
                            {stato}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.excluded}
                        onChange={(e) => updateLineupRow(teamIndex, rowIndex, { excluded: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-secondary" onClick={() => addLineupRow(teamIndex)}>
              + aggiungi giocatore
            </button>

            <table className="table" style={{ maxWidth: 640, margin: "18px 0 10px" }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Tipo</th>
                  <th>Giocatore</th>
                  <th style={{ width: 90 }}>Rank</th>
                  <th style={{ width: 80 }}>Escludi</th>
                </tr>
              </thead>
              <tbody>
                {draft.setPieceRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      <select
                        className="input"
                        style={{ minHeight: 28 }}
                        value={row.tipo}
                        onChange={(e) =>
                          updateSetPieceRow(teamIndex, rowIndex, { tipo: e.target.value as SetPieceTakerTipo })
                        }
                      >
                        {SET_PIECE_TAKER_TIPI.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ minHeight: 28 }}
                        value={row.player_name}
                        onChange={(e) => updateSetPieceRow(teamIndex, rowIndex, { player_name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ minHeight: 28 }}
                        type="number"
                        min={1}
                        value={row.rank}
                        onChange={(e) =>
                          updateSetPieceRow(teamIndex, rowIndex, { rank: Number(e.target.value) || 1 })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.excluded}
                        onChange={(e) => updateSetPieceRow(teamIndex, rowIndex, { excluded: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => addSetPieceRow(teamIndex, "rigore")}>
                + aggiungi rigorista
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addSetPieceRow(teamIndex, "punizione")}>
                + aggiungi tiratore punizioni
              </button>
            </div>
          </div>
        ))}

      <div style={{ marginTop: 20 }}>
        <ProbableLineupBoard refreshToken={refreshToken} />
      </div>
    </>
  );
}
