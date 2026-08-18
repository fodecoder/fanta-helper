import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ProbableLineupStato, SetPieceTakerTipo } from "@fanta-helper/shared";
import { PROBABLE_LINEUP_STATI, SET_PIECE_TAKER_TIPI } from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import { ProbableLineupApiError } from "../api/probableLineup";
import * as setPieceTakerApi from "../api/setPieceTaker";
import { SetPieceTakerApiError } from "../api/setPieceTaker";
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

interface SetPieceDraftRow {
  tipo: SetPieceTakerTipo;
  player_name: string;
  rank: number;
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

  const [spTeam, setSpTeam] = useState("");
  const [spFile, setSpFile] = useState<File | null>(null);
  const [spDraftRows, setSpDraftRows] = useState<SetPieceDraftRow[] | null>(null);
  const [spDiscardedCount, setSpDiscardedCount] = useState(0);
  const [spGeneralError, setSpGeneralError] = useState<string | null>(null);
  const [spExtracting, setSpExtracting] = useState(false);
  const [spConfirming, setSpConfirming] = useState(false);
  const [spConfirmReport, setSpConfirmReport] = useState<string | null>(null);

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

  const hasSpEditableRows = useMemo(() => (spDraftRows?.length ?? 0) > 0, [spDraftRows]);

  async function handleSpExtract(event: FormEvent) {
    event.preventDefault();
    if (spTeam.trim() === "") {
      setSpGeneralError("indica la squadra");
      return;
    }
    if (!spFile) {
      setSpGeneralError("seleziona uno screenshot PNG o JPEG");
      return;
    }
    setSpGeneralError(null);
    setSpConfirmReport(null);
    setSpDraftRows(null);
    setSpExtracting(true);
    try {
      const result = await setPieceTakerApi.extractSetPieceTakers(spTeam.trim(), spFile);
      setSpDraftRows(
        result.rows.map((row) => ({
          tipo: row.tipo,
          player_name: row.player_name,
          rank: row.rank,
          uncertain: row.uncertain,
          reason: row.reason,
          excluded: false,
        })),
      );
      setSpDiscardedCount(result.discarded.length);
    } catch (err) {
      setSpGeneralError(
        err instanceof SetPieceTakerApiError
          ? err.payload.error.message
          : err instanceof Error
            ? err.message
            : "estrazione fallita",
      );
    } finally {
      setSpExtracting(false);
    }
  }

  function updateSpRow(index: number, patch: Partial<SetPieceDraftRow>) {
    setSpDraftRows(
      (rows) => rows?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null,
    );
  }

  async function handleSpConfirm() {
    if (!spDraftRows) return;
    const finalRows = spDraftRows
      .filter((row) => !row.excluded)
      .map((row) => ({ tipo: row.tipo, player_name: row.player_name, rank: row.rank }));
    if (finalRows.length === 0) {
      setSpGeneralError("nessuna riga da confermare");
      return;
    }
    setSpGeneralError(null);
    setSpConfirming(true);
    try {
      const report = await setPieceTakerApi.confirmSetPieceTakers(spTeam.trim(), finalRows);
      setSpConfirmReport(`Calci piazzati ${report.team} salvati: ${report.entries} righe.`);
      setSpDraftRows(null);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setSpGeneralError(
        err instanceof SetPieceTakerApiError
          ? err.payload.error.message
          : err instanceof Error
            ? err.message
            : "conferma fallita",
      );
    } finally {
      setSpConfirming(false);
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
        <h2>Rigoristi e tiratori di punizioni</h2>
        <p>
          Carica lo screenshot della gerarchia editoriale dei calci piazzati di una squadra:
          il backend estrae le righe leggibili, quelle incerte sono evidenziate per la
          revisione. Nessuna riga viene salvata finché non confermi.
        </p>
        {spGeneralError && <StatusMessage kind="error">{spGeneralError}</StatusMessage>}
        {spConfirmReport && <StatusMessage kind="empty">{spConfirmReport}</StatusMessage>}

        <form onSubmit={handleSpExtract}>
          <label>
            Squadra
            <input
              type="text"
              list="probable-lineup-teams"
              value={spTeam}
              onChange={(e) => setSpTeam(e.target.value)}
              placeholder="es. Inter"
            />
          </label>
          <label>
            Screenshot (PNG o JPEG)
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setSpFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={spExtracting}>
              {spExtracting ? "Estrazione in corso…" : "Estrai"}
            </button>
          </div>
        </form>

        {spDiscardedCount > 0 && (
          <p>{spDiscardedCount} riga/righe scartate dal modello (formato non interpretabile).</p>
        )}
      </section>

      {hasSpEditableRows && (
        <section className="card">
          <h2>Revisione bozza — {spTeam}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Giocatore</th>
                  <th>Rank</th>
                  <th>Escludi</th>
                </tr>
              </thead>
              <tbody>
                {spDraftRows!.map((row, index) => (
                  <tr
                    key={index}
                    className={row.uncertain ? "probable-lineup-row--uncertain" : undefined}
                  >
                    <td>
                      <select
                        value={row.tipo}
                        onChange={(e) =>
                          updateSpRow(index, { tipo: e.target.value as SetPieceTakerTipo })
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
                        type="text"
                        value={row.player_name}
                        onChange={(e) => updateSpRow(index, { player_name: e.target.value })}
                      />
                      {row.uncertain && (
                        <div className="probable-lineup-row__reason">
                          incerto{row.reason ? `: ${row.reason}` : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={row.rank}
                        onChange={(e) =>
                          updateSpRow(index, { rank: Number(e.target.value) || 1 })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.excluded}
                        onChange={(e) => updateSpRow(index, { excluded: e.target.checked })}
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
              onClick={handleSpConfirm}
              disabled={spConfirming}
            >
              {spConfirming ? "Conferma in corso…" : "Conferma"}
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
