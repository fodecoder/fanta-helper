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
    setMatched((rows) =>
      rows.map((r, i) => (i === index ? { ...r, saving: true, error: null } : r)),
    );
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
      setMatched((rows) =>
        rows.map((r, i) => (i === index ? { ...r, saving: false, saved: true } : r)),
      );
      onResolved();
      return true;
    } catch (err) {
      const message =
        err instanceof ValuationsApiError ? err.payload.error.message : "salvataggio fallito";
      setMatched((rows) =>
        rows.map((r, i) => (i === index ? { ...r, saving: false, error: message } : r)),
      );
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
  const numberCol = { width: 82 } as const;

  return (
    <div style={{ marginBottom: matched.length > 0 || unmatched.length > 0 ? 40 : 0 }}>
      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? "Generazione in corso…" : "Genera valutazioni"}
        </button>
        <span className="text-muted" style={{ fontSize: 12 }}>
          La generazione chiama Claude per ruolo: qualche decina di secondi.
        </span>
      </div>

      {matched.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "26px 0 10px" }}>
            <h3 style={{ margin: 0 }}>Revisione bozza</h3>
            <span className="text-muted" style={{ fontSize: 12 }}>
              {pendingCount} righe abbinate a un giocatore
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
              onClick={() => void handleSaveAll()}
              disabled={savingAll || pendingCount === 0}
            >
              {savingAll ? "Salvataggio…" : "Salva tutto"}
            </button>
          </div>
          <div className="table-scroll">
            <table className="table" style={{ minWidth: 1020 }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Squadra</th>
                  <th>Ruolo</th>
                  <th style={{ width: 70 }}>Tier</th>
                  <th style={numberCol}>Target</th>
                  <th style={numberCol}>Fair value</th>
                  <th style={numberCol}>Max bid</th>
                  <th style={numberCol}>Panic</th>
                  <th style={{ width: 110 }}>Confidence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matched.map((row, index) =>
                  row.saved ? null : (
                    <tr key={row.draft.player_id}>
                      <td style={{ whiteSpace: "nowrap" }}>{row.draft.name}</td>
                      <td>{row.draft.team}</td>
                      <td>{row.draft.ruolo}</td>
                      <td>
                        <input
                          className="input"
                          style={{ minHeight: 28 }}
                          value={row.draft.tier}
                          onChange={(e) => updateRow(index, { tier: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ minHeight: 28 }}
                          type="number"
                          min={0}
                          value={row.draft.target}
                          onChange={(e) => updateRow(index, { target: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ minHeight: 28 }}
                          type="number"
                          min={0}
                          value={row.draft.fair_value}
                          onChange={(e) => updateRow(index, { fair_value: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ minHeight: 28 }}
                          type="number"
                          min={0}
                          value={row.draft.max_bid}
                          onChange={(e) => updateRow(index, { max_bid: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ minHeight: 28 }}
                          type="number"
                          min={0}
                          value={row.draft.panic_price}
                          onChange={(e) =>
                            updateRow(index, { panic_price: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          style={{ minHeight: 28 }}
                          value={row.draft.confidence}
                          onChange={(e) =>
                            updateRow(index, { confidence: e.target.value as Confidence })
                          }
                        >
                          {CONFIDENCE_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          onClick={() => setMatched((rows) => rows.filter((_, i) => i !== index))}
                          disabled={row.saving}
                        >
                          Scarta
                        </button>
                        {row.error && (
                          <div style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>
                            {row.error}
                          </div>
                        )}
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
        <>
          <h3 style={{ margin: "26px 0 8px" }}>Righe non abbinate</h3>
          <table className="table" style={{ maxWidth: 760 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Tier</th>
                <th>Motivo</th>
                <th>Assegna a</th>
                <th />
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
        </>
      )}

      {discarded.length > 0 && (
        <p className="text-muted" style={{ fontSize: 13, marginTop: 10 }}>
          {discarded.length} righe scartate dal modello (mai stimate).
        </p>
      )}
    </div>
  );
}
