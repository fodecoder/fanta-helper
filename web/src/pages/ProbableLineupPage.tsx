import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ProbableLineupStato, SetPieceTakerTipo } from "@fanta-helper/shared";
import { PROBABLE_LINEUP_STATI, SET_PIECE_TAKER_TIPI } from "@fanta-helper/shared";
import * as lineupApi from "../api/probableLineup";
import { ProbableLineupApiError } from "../api/probableLineup";
import * as setPieceTakerApi from "../api/setPieceTaker";
import { SetPieceTakerApiError } from "../api/setPieceTaker";
import * as playersApi from "../api/players";
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

export function ProbableLineupPage({ calls }: ProbableLineupPageProps) {
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
        setTeams([...new Set(players.map((p) => p.team))].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        // La lista squadre è solo un suggerimento del campo: se non si carica,
        // l'utente digita il nome a mano.
      });
    return () => controller.abort();
  }, []);

  const hasEditableRows = useMemo(() => (draftRows?.length ?? 0) > 0, [draftRows]);
  const hasSpEditableRows = useMemo(() => (spDraftRows?.length ?? 0) > 0, [spDraftRows]);

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    if (team.trim() === "") return setGeneralError("indica la squadra");
    if (!file) return setGeneralError("seleziona uno screenshot PNG o JPEG");
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
    setDraftRows(
      (rows) => rows?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null,
    );
  }

  async function handleConfirm() {
    if (!draftRows) return;
    const finalRows = draftRows
      .filter((row) => !row.excluded)
      .map((row) => ({ player_name: row.player_name, ruolo: row.ruolo, stato: row.stato }));
    if (finalRows.length === 0) return setGeneralError("nessuna riga da confermare");
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

  async function handleSpExtract(event: FormEvent) {
    event.preventDefault();
    if (spTeam.trim() === "") return setSpGeneralError("indica la squadra");
    if (!spFile) return setSpGeneralError("seleziona uno screenshot PNG o JPEG");
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
    if (finalRows.length === 0) return setSpGeneralError("nessuna riga da confermare");
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
    <>
      <PageMasthead
        kicker="Riferimento globale · undici probabili"
        title="Probabili formazioni"
        subtitle="Screenshot editoriale → estrazione → revisione → conferma. Le righe che il modello non ha letto con certezza restano evidenziate: nessun dato inventato, nessuna riga salvata prima della conferma."
        calls={calls}
      />

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}
      {confirmReport && <StatusMessage kind="empty">{confirmReport}</StatusMessage>}

      <form
        onSubmit={handleExtract}
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          marginBottom: 34,
          flexWrap: "wrap",
        }}
      >
        <div className="field" style={{ width: 190 }}>
          <label htmlFor="pl-team">Squadra</label>
          <input
            id="pl-team"
            className="input"
            list="pl-teams"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="es. Inter"
          />
          <datalist id="pl-teams">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="field" style={{ width: 300 }}>
          <label htmlFor="pl-file">Screenshot (PNG o JPEG)</label>
          <input
            id="pl-file"
            className="input"
            style={{ padding: 6 }}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={extracting}>
          {extracting ? "Estrazione…" : "Estrai"}
        </button>
      </form>
      {discardedCount > 0 && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          {discardedCount} riga/righe scartate dal modello (formato non interpretabile).
        </p>
      )}

      {hasEditableRows && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "10px 0" }}>
            <h3 style={{ margin: 0 }}>Revisione bozza — {team}</h3>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
              onClick={() => void handleConfirm()}
              disabled={confirming}
            >
              {confirming ? "Conferma…" : "Conferma"}
            </button>
          </div>
          <table className="table" style={{ maxWidth: 720 }}>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th style={{ width: 90 }}>Ruolo</th>
                <th style={{ width: 150 }}>Stato</th>
                <th style={{ width: 80 }}>Escludi</th>
              </tr>
            </thead>
            <tbody>
              {draftRows!.map((row, index) => (
                <tr key={index} className={row.uncertain ? "row-uncertain" : undefined}>
                  <td>
                    <input
                      className="input"
                      style={{ minHeight: 28 }}
                      value={row.player_name}
                      onChange={(e) => updateRow(index, { player_name: e.target.value })}
                    />
                    {row.uncertain && (
                      <div className="row-reason">incerto{row.reason ? `: ${row.reason}` : ""}</div>
                    )}
                  </td>
                  <td>
                    <input
                      className="input"
                      style={{ minHeight: 28 }}
                      value={row.ruolo ?? ""}
                      onChange={(e) => updateRow(index, { ruolo: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ minHeight: 28 }}
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
      )}

      <h3 style={{ margin: "0 0 12px" }}>Rigoristi e tiratori di punizioni</h3>
      {spGeneralError && <StatusMessage kind="error">{spGeneralError}</StatusMessage>}
      {spConfirmReport && <StatusMessage kind="empty">{spConfirmReport}</StatusMessage>}
      <form
        onSubmit={handleSpExtract}
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          marginBottom: 34,
          flexWrap: "wrap",
        }}
      >
        <div className="field" style={{ width: 190 }}>
          <label htmlFor="sp-team">Squadra</label>
          <input
            id="sp-team"
            className="input"
            list="pl-teams"
            value={spTeam}
            onChange={(e) => setSpTeam(e.target.value)}
            placeholder="es. Inter"
          />
        </div>
        <div className="field" style={{ width: 300 }}>
          <label htmlFor="sp-file">Screenshot (PNG o JPEG)</label>
          <input
            id="sp-file"
            className="input"
            style={{ padding: 6 }}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setSpFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={spExtracting}>
          {spExtracting ? "Estrazione…" : "Estrai"}
        </button>
      </form>
      {spDiscardedCount > 0 && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          {spDiscardedCount} riga/righe scartate dal modello (formato non interpretabile).
        </p>
      )}

      {hasSpEditableRows && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "10px 0" }}>
            <h3 style={{ margin: 0 }}>Revisione bozza — {spTeam}</h3>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
              onClick={() => void handleSpConfirm()}
              disabled={spConfirming}
            >
              {spConfirming ? "Conferma…" : "Conferma"}
            </button>
          </div>
          <table className="table" style={{ maxWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Tipo</th>
                <th>Giocatore</th>
                <th style={{ width: 90 }}>Rank</th>
                <th style={{ width: 80 }}>Escludi</th>
              </tr>
            </thead>
            <tbody>
              {spDraftRows!.map((row, index) => (
                <tr key={index} className={row.uncertain ? "row-uncertain" : undefined}>
                  <td>
                    <select
                      className="input"
                      style={{ minHeight: 28 }}
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
                      className="input"
                      style={{ minHeight: 28 }}
                      value={row.player_name}
                      onChange={(e) => updateSpRow(index, { player_name: e.target.value })}
                    />
                    {row.uncertain && (
                      <div className="row-reason">incerto{row.reason ? `: ${row.reason}` : ""}</div>
                    )}
                  </td>
                  <td>
                    <input
                      className="input"
                      style={{ minHeight: 28 }}
                      type="number"
                      min={1}
                      value={row.rank}
                      onChange={(e) => updateSpRow(index, { rank: Number(e.target.value) || 1 })}
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
      )}

      <div style={{ marginTop: 20 }}>
        <ProbableLineupBoard refreshToken={refreshToken} />
      </div>
    </>
  );
}
