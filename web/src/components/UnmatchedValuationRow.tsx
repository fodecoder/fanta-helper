import { useState } from "react";
import type { Player, UnmatchedValuation } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import { PlayerAvatar } from "./PlayerAvatar";

interface UnmatchedValuationRowProps {
  leagueId: number;
  entry: UnmatchedValuation;
  players: Player[];
  onAssigned: () => void;
  onDiscarded: () => void;
}

export function UnmatchedValuationRow({
  leagueId,
  entry,
  players,
  onAssigned,
  onDiscarded,
}: UnmatchedValuationRowProps) {
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
      <td style={{ color: "var(--color-accent-2-700)", fontSize: 13 }}>{entry.reason}</td>
      <td>
        <input
          className="input"
          style={{ marginBottom: 5 }}
          placeholder="filtra per nome/squadra"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select className="input" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          <option value="">— seleziona —</option>
          {filtered.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.team}, {player.ruolo})
            </option>
          ))}
        </select>
        {error && (
          <p style={{ color: "var(--color-accent-2-700)", fontSize: 12, margin: "4px 0 0" }}>
            {error}
          </p>
        )}
      </td>
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={submitting}
          >
            Assegna
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDiscarded}
            disabled={submitting}
          >
            Scarta
          </button>
        </div>
      </td>
    </tr>
  );
}
