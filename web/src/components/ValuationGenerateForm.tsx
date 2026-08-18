import { useEffect, useState } from "react";
import type {
  Confidence,
  DiscardedExtractionRow,
  Player,
  UnmatchedValuation,
  ValuationMatchedDraft,
} from "@fanta-helper/shared";
import { CONFIDENCE_LEVELS } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import * as playersApi from "../api/players";
import { StatusMessage } from "./StatusMessage";
import { PlayerAvatar } from "./PlayerAvatar";
import { UnmatchedValuationRow } from "./UnmatchedValuationRow";

interface ValuationGenerateFormProps {
  leagueId: number;
  onResolved: () => void;
}

interface MatchedRowState {
  draft: ValuationMatchedDraft;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

function toRowState(draft: ValuationMatchedDraft): MatchedRowState {
  return { draft, saving: false, saved: false, error: null };
}

export function ValuationGenerateForm({ leagueId, onResolved }: ValuationGenerateFormProps) {
  const [generating, setGenerating] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedRowState[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedValuation[]>([]);
  const [discarded, setDiscarded] = useState<DiscardedExtractionRow[]>([]);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (unmatched.length === 0 || players !== null) return;
    const controller = new AbortController();
    playersApi
      .listPlayers(controller.signal)
      .then(setPlayers)
      .catch(() => setPlayers([]));
    return () => controller.abort();
  }, [unmatched.length, players]);

  async function handleGenerate() {
    setGeneralError(null);
    setMatched([]);
    setUnmatched([]);
    setDiscarded([]);
    setGenerating(true);
    try {
      const result = await valuationsApi.generateValuations(leagueId);
      setMatched(result.matched.map(toRowState));
      setUnmatched(result.unmatched);
      setDiscarded(result.discarded);
    } catch (err) {
      setGeneralError(
        err instanceof ValuationsApiError ? err.payload.error.message : "generazione fallita",
      );
    } finally {
      setGenerating(false);
    }
  }

  function updateRow(index: number, patch: Partial<ValuationMatchedDraft>) {
    setMatched((rows) =>
      rows.map((row, i) => (i === index ? { ...row, draft: { ...row.draft, ...patch } } : row)),
    );
  }

  async function saveRow(index: number): Promise<boolean> {
    const row = matched[index];
    if (!row || row.saving || row.saved) return true;
    setMatched((rows) => rows.map((r, i) => (i === index ? { ...r, saving: true, error: null } : r)));
    try {
      await valuationsApi.upsertValuation(leagueId, row.draft.player_id, {
        tier: row.draft.tier,
        target: row.draft.target,
        fair_value: row.draft.fair_value,
        max_bid: row.draft.max_bid,
        panic_price: row.draft.panic_price,
        confidence: row.draft.confidence,
        note: row.draft.note,
      });
      setMatched((rows) => rows.map((r, i) => (i === index ? { ...r, saving: false, saved: true } : r)));
      onResolved();
      return true;
    } catch (err) {
      const message =
        err instanceof ValuationsApiError ? err.payload.error.message : "salvataggio fallito";
      setMatched((rows) => rows.map((r, i) => (i === index ? { ...r, saving: false, error: message } : r)));
      return false;
    }
  }

  async function handleSaveAll() {
    setSavingAll(true);
    for (let i = 0; i < matched.length; i++) {
      await saveRow(i);
    }
    setSavingAll(false);
  }

  const pendingCount = matched.filter((row) => !row.saved).length;

  return (
    <section className="card">
      <h2>Genera valutazioni</h2>

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generazione in corso…" : "Genera valutazioni"}
        </button>
        {generating && (
          <p>Chiamata a Claude in corso, a chunk per ruolo: può richiedere qualche decina di secondi.</p>
        )}
      </div>

      {matched.length > 0 && (
        <>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={savingAll || pendingCount === 0}>
              {savingAll ? "Salvataggio in corso…" : `Salva tutto (${pendingCount})`}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Squadra</th>
                  <th>Ruolo</th>
                  <th>Tier</th>
                  <th className="num">Target</th>
                  <th className="num">Fair value</th>
                  <th className="num">Max bid</th>
                  <th className="num">Panic price</th>
                  <th>Confidence</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matched.map((row, index) =>
                  row.saved ? null : (
                    <tr key={row.draft.player_id}>
                      <td>
                        <div className="player-name-cell">
                          <PlayerAvatar name={row.draft.name} team={row.draft.team} ruolo={row.draft.ruolo} size="sm" />
                          {row.draft.name}
                        </div>
                      </td>
                      <td>{row.draft.team}</td>
                      <td>{row.draft.ruolo}</td>
                      <td>
                        <input
                          value={row.draft.tier}
                          onChange={(e) => updateRow(index, { tier: e.target.value })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min={0}
                          value={row.draft.target}
                          onChange={(e) => updateRow(index, { target: Number(e.target.value) })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min={0}
                          value={row.draft.fair_value}
                          onChange={(e) => updateRow(index, { fair_value: Number(e.target.value) })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min={0}
                          value={row.draft.max_bid}
                          onChange={(e) => updateRow(index, { max_bid: Number(e.target.value) })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min={0}
                          value={row.draft.panic_price}
                          onChange={(e) => updateRow(index, { panic_price: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <select
                          value={row.draft.confidence}
                          onChange={(e) => updateRow(index, { confidence: e.target.value as Confidence })}
                        >
                          {CONFIDENCE_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={row.draft.note ?? ""}
                          onChange={(e) => updateRow(index, { note: e.target.value === "" ? null : e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void saveRow(index)}
                            disabled={row.saving}
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setMatched((rows) => rows.filter((_, i) => i !== index))}
                            disabled={row.saving}
                          >
                            Scarta
                          </button>
                        </div>
                        {row.error && <p className="field-error">{row.error}</p>}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
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

      {discarded.length > 0 && (
        <div>
          <p>{discarded.length} righe scartate dal modello (mai stimate):</p>
          <ul>
            {discarded.map((row) => (
              <li key={row.index}>{row.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
