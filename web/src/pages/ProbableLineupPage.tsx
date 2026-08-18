import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ProbableLineupStato } from "@fanta-helper/shared";
import { PROBABLE_LINEUP_STATI } from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import { ProbableLineupApiError } from "../api/probableLineup";
import * as playersApi from "../api/players";
import { ProbableLineupBoard } from "../components/ProbableLineupBoard";
import { StatusMessage } from "../components/StatusMessage";
import { PageHeader } from "../components/PageHeader";

interface DraftRow {
  player_name: string;
  ruolo: string | null;
  stato: ProbableLineupStato;
  uncertain: boolean;
  reason?: string;
  excluded: boolean;
}

export function ProbableLineupPage() {
  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[] | null>(null);
  const [discardedCount, setDiscardedCount] = useState(0);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmReport, setConfirmReport] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    playersApi
      .listPlayers(controller.signal)
      .then((players) => {
        const distinct = [...new Set(players.map((p) => p.team))].sort((a, b) =>
          a.localeCompare(b),
        );
        setTeams(distinct);
      })
      .catch(() => {
        // La lista squadre è solo un suggerimento per il campo di input: se
        // non si carica, l'utente può comunque digitare il nome a mano.
      });
    return () => controller.abort();
  }, []);

  const hasEditableRows = useMemo(() => (draftRows?.length ?? 0) > 0, [draftRows]);

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    if (team.trim() === "") {
      setGeneralError("indica la squadra");
      return;
    }
    if (!file) {
      setGeneralError("seleziona uno screenshot PNG o JPEG");
      return;
    }
    setGeneralError(null);
    setConfirmReport(null);
    setDraftRows(null);
    setExtracting(true);
    try {
      const result = await lineupApi.extractProbableLineup(team.trim(), file);
      setDraftRows(
        result.rows.map((row) => ({
          player_name: row.player_name,
          ruolo: row.ruolo,
          stato: row.stato,
          uncertain: row.uncertain,
          reason: row.reason,
          excluded: false,
        })),
      );
      setDiscardedCount(result.discarded.length);
    } catch (err) {
      setGeneralError(
        err instanceof ProbableLineupApiError
          ? err.payload.error.message
          : err instanceof Error
            ? err.message
            : "estrazione fallita",
      );
    } finally {
      setExtracting(false);
    }
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setDraftRows((rows) => rows?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
  }

  async function handleConfirm() {
    if (!draftRows) return;
    const finalRows = draftRows
      .filter((row) => !row.excluded)
      .map((row) => ({ player_name: row.player_name, ruolo: row.ruolo, stato: row.stato }));
    if (finalRows.length === 0) {
      setGeneralError("nessuna riga da confermare");
      return;
    }
    setGeneralError(null);
    setConfirming(true);
    try {
      const report = await lineupApi.confirmProbableLineup(team.trim(), finalRows);
      setConfirmReport(`Formazione ${report.team} salvata: ${report.entries} giocatori.`);
      setDraftRows(null);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setGeneralError(
        err instanceof ProbableLineupApiError
          ? err.payload.error.message
          : err instanceof Error
            ? err.message
            : "conferma fallita",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Probabili formazioni" />

      <section className="card">
        <p>
          Carica lo screenshot della probabile formazione editoriale di una squadra: il
          backend estrae le righe leggibili, quelle incerte sono evidenziate per la
          revisione. Nessuna riga viene salvata finché non confermi.
        </p>
        {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}
        {confirmReport && <StatusMessage kind="empty">{confirmReport}</StatusMessage>}

        <form onSubmit={handleExtract}>
          <label>
            Squadra
            <input
              type="text"
              list="probable-lineup-teams"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="es. Inter"
            />
            <datalist id="probable-lineup-teams">
              {teams.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label>
            Screenshot (PNG o JPEG)
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={extracting}>
              {extracting ? "Estrazione in corso…" : "Estrai"}
            </button>
          </div>
        </form>

        {discardedCount > 0 && (
          <p>{discardedCount} riga/righe scartate dal modello (formato non interpretabile).</p>
        )}
      </section>

      {hasEditableRows && (
        <section className="card">
          <h2>Revisione bozza — {team}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th>Escludi</th>
                </tr>
              </thead>
              <tbody>
                {draftRows!.map((row, index) => (
                  <tr
                    key={index}
                    className={row.uncertain ? "probable-lineup-row--uncertain" : undefined}
                  >
                    <td>
                      <input
                        type="text"
                        value={row.player_name}
                        onChange={(e) => updateRow(index, { player_name: e.target.value })}
                      />
                      {row.uncertain && (
                        <div className="probable-lineup-row__reason">
                          incerto{row.reason ? `: ${row.reason}` : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.ruolo ?? ""}
                        onChange={(e) => updateRow(index, { ruolo: e.target.value || null })}
                      />
                    </td>
                    <td>
                      <select
                        value={row.stato}
                        onChange={(e) =>
                          updateRow(index, { stato: e.target.value as ProbableLineupStato })
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
                        onChange={(e) => updateRow(index, { excluded: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? "Conferma in corso…" : "Conferma"}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Formazioni confermate</h2>
        <ProbableLineupBoard refreshToken={refreshToken} />
      </section>
    </div>
  );
}
