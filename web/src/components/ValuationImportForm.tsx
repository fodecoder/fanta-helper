import { useEffect, useState, type FormEvent } from "react";
import type { Player, UnmatchedValuation, ValuationImportReport } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import * as playersApi from "../api/players";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";

interface ValuationImportFormProps {
  leagueId: number;
  onResolved: () => void;
}

interface UnmatchedRowProps {
  leagueId: number;
  entry: UnmatchedValuation;
  players: Player[];
  onAssigned: () => void;
  onDiscarded: () => void;
}

function UnmatchedRow({ leagueId, entry, players, onAssigned, onDiscarded }: UnmatchedRowProps) {
  const [filter, setFilter] = useState("");
  const [playerId, setPlayerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = players.filter((player) => {
    const needle = filter.trim().toLowerCase();
    if (needle === "") return true;
    return player.name.toLowerCase().includes(needle) || player.team.toLowerCase().includes(needle);
  });

  async function handleAssign() {
    if (playerId === "") {
      setError("seleziona un giocatore");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await valuationsApi.upsertValuation(leagueId, Number(playerId), {
        tier: entry.tier,
        target: entry.target,
        fair_value: entry.fair_value,
        max_bid: entry.max_bid,
        panic_price: entry.panic_price,
        confidence: entry.confidence,
        note: entry.note,
      });
      onAssigned();
    } catch (err) {
      setError(
        err instanceof ValuationsApiError ? err.payload.error.message : "assegnazione fallita",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr>
      <td>
        <div className="player-name-cell">
          <PlayerAvatar name={entry.name} team={entry.team} ruolo={entry.ruolo} size="sm" />
          {entry.name}
        </div>
      </td>
      <td>{entry.team}</td>
      <td>{entry.ruolo}</td>
      <td>{entry.tier}</td>
      <td>{entry.reason}</td>
      <td>
        <input
          placeholder="filtra per nome/squadra"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          <option value="">— seleziona —</option>
          {filtered.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.team}, {player.ruolo})
            </option>
          ))}
        </select>
        {error && <p className="field-error">{error}</p>}
      </td>
      <td>
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={submitting}>
            Assegna
          </button>
          <button type="button" className="btn btn-secondary" onClick={onDiscarded} disabled={submitting}>
            Scarta
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ValuationImportForm({ leagueId, onResolved }: ValuationImportFormProps) {
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
    <section className="card">
      <h2>Import valutazioni</h2>

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <form onSubmit={handleSubmit}>
        <label>
          File JSON
          <input
            type="file"
            accept=".json,application/json"
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
          Importate: {report.imported} · Aggiornate: {report.updated} · Unmatched:{" "}
          {unmatched.length}
        </p>
      )}

      {unmatched.length > 0 && (
        <div className="table-wrap">
          <table>
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
                <UnmatchedRow
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
    </section>
  );
}
