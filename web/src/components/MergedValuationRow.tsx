import { useState } from "react";
import type { PlayerRecommendationWithTags, ValuationWithPlayer } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import { roleColor } from "../lib/auctionDerivations";
import { PlayerAvatar } from "./PlayerAvatar";

type AmountField = "target" | "fair_value" | "max_bid" | "panic_price";

interface MergedValuationRowProps {
  leagueId: number;
  rec: PlayerRecommendationWithTags;
  // Riga di listino NON riscalata (base 1000, già coalesced override → base).
  // Assente quando la lega non ha ancora una valutazione per il giocatore:
  // in quel caso le colonne di listino restano sola lettura.
  valuation: ValuationWithPlayer | null;
  factor: number;
  normalizedScore: number | undefined;
  purchased: boolean;
  isTrap: boolean;
  onToggleTrap: () => void;
  onDetails: () => void;
  onSaved: () => void;
}

// Mostra i valori riscalati per il budget di lega ma li salva riconvertiti
// sulla base 1000, così l'override vive nella stessa unità del listino.
function toDisplay(base1000: number, factor: number): number {
  return factor === 1 ? base1000 : Math.round(base1000 * factor);
}
function toBase(display: number, factor: number): number {
  return factor === 1 ? display : Math.round(display / factor);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function MergedValuationRow({
  leagueId,
  rec: r,
  valuation: v,
  factor,
  normalizedScore,
  purchased,
  isTrap,
  onToggleTrap,
  onDetails,
  onSaved,
}: MergedValuationRowProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambia a ogni salvataggio: rimonta gli input non controllati con i nuovi
  // defaultValue senza specchiare lo stato del server in un useEffect.
  const [rev, setRev] = useState(0);

  const isOverridden = (field: AmountField | "note") => v?.override?.[field] != null;

  async function save(patch: Parameters<typeof valuationsApi.upsertValuationOverride>[2]) {
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      await valuationsApi.upsertValuationOverride(leagueId, v.player_id, patch);
      setRev((n) => n + 1);
      onSaved();
    } catch (err) {
      setError(err instanceof ValuationsApiError ? err.payload.error.message : "salvataggio fallito");
    } finally {
      setBusy(false);
    }
  }

  function commitAmount(field: AmountField, raw: string) {
    if (!v) return;
    const trimmed = raw.trim();
    const current = toDisplay(v[field], factor);
    if (trimmed === "") {
      if (isOverridden(field)) void save({ [field]: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("valore non valido");
      return;
    }
    if (parsed === current) return;
    void save({ [field]: toBase(parsed, factor) });
  }

  function commitNote(raw: string) {
    if (!v) return;
    const trimmed = raw.trim();
    if (trimmed === (v.note ?? "")) return;
    void save({ note: trimmed === "" ? null : trimmed });
  }

  async function resetAll() {
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      await valuationsApi.resetValuationOverride(leagueId, v.player_id);
      setRev((n) => n + 1);
      onSaved();
    } catch (err) {
      setError(err instanceof ValuationsApiError ? err.payload.error.message : "ripristino fallito");
    } finally {
      setBusy(false);
    }
  }

  const cellInput = (field: AmountField) =>
    v ? (
      <input
        key={`${field}-${rev}`}
        className="input"
        inputMode="numeric"
        style={{
          width: 70,
          textAlign: "right",
          ...(isOverridden(field)
            ? { borderColor: "var(--color-accent-700)", fontWeight: 600 }
            : undefined),
        }}
        defaultValue={String(toDisplay(v[field], factor))}
        disabled={busy}
        onBlur={(e) => commitAmount(field, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    ) : (
      <span className="text-muted">—</span>
    );

  const occasione = r.price.gapSignal !== null && r.price.gapSignal > 0.25;
  const muted = purchased || r.components.dataMissing || !r.components.ioNeedsRole;

  return (
    <tr style={muted ? { opacity: 0.5 } : undefined}>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="player-name-cell">
          <PlayerAvatar
            name={r.nome_completo ?? r.name}
            team={r.team}
            ruolo={r.ruolo}
            image_url={r.image_url}
            size="sm"
          />
          {r.nome_completo ?? r.name}
        </span>
      </td>
      <td>{r.team}</td>
      <td style={{ color: roleColor(r.ruolo) }}>{r.ruolo}</td>
      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
        {normalizedScore !== undefined ? normalizedScore.toFixed(1) : "—"}
      </td>
      <td>
        <span className={r.tier === "Top" ? "tag tag-accent" : "tag tag-neutral"}>{r.tier}</span>
        {occasione && (
          <span className="tag tag-accent" style={{ marginLeft: 6 }}>
            Occasione
          </span>
        )}
        {r.teamPref === "avoid" && (
          <span
            className="tag tag-neutral"
            style={{ marginLeft: 6, color: "var(--color-accent-2-700)" }}
          >
            squadra da evitare
          </span>
        )}
        {r.teamPref === "prefer" && (
          <span className="tag tag-accent" style={{ marginLeft: 6 }}>
            squadra preferita
          </span>
        )}
        {r.tags.map((t) => (
          <span
            key={t.id}
            className={t.id === "trappola" ? "tag tag-accent-2" : "tag tag-neutral"}
            style={{ marginLeft: 6 }}
          >
            {t.label}
          </span>
        ))}
      </td>
      <td className="num" style={{ textAlign: "right" }}>
        {r.components.leagueAdjustedFm !== null ? r.components.leagueAdjustedFm.toFixed(2) : "—"}
      </td>
      <td className="num" style={{ textAlign: "right" }}>
        {pct(r.components.reliability)}
      </td>
      <td className="num" style={{ textAlign: "right" }}>
        {r.price.qt_a ?? "—"}
      </td>
      <td className="num" style={{ textAlign: "right" }}>
        {r.price.fvm ?? "—"}
      </td>
      <td style={{ textAlign: "right" }}>{cellInput("target")}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {cellInput("fair_value")}
        {v && (
          <span
            className="text-muted"
            style={{ marginLeft: 6, fontSize: 11 }}
            title="Fascia di listino"
          >
            {v.tier}
          </span>
        )}
      </td>
      <td style={{ textAlign: "right" }}>{cellInput("max_bid")}</td>
      <td style={{ textAlign: "right" }}>{cellInput("panic_price")}</td>
      <td>
        {v ? (
          <input
            key={`note-${rev}`}
            className="input"
            style={{
              width: 150,
              ...(isOverridden("note") ? { borderColor: "var(--color-accent-700)" } : undefined),
            }}
            placeholder="nota personale"
            defaultValue={v.note ?? ""}
            disabled={busy}
            onBlur={(e) => commitNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "2px 10px", fontSize: 12 }}
          onClick={onDetails}
        >
          Dettagli
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "2px 10px", fontSize: 12, marginLeft: 6 }}
          aria-pressed={isTrap}
          onClick={onToggleTrap}
        >
          {isTrap ? "Rimuovi trappola" : "Segna trappola"}
        </button>
        {v?.override != null && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "2px 10px", fontSize: 12, marginLeft: 6 }}
            onClick={() => void resetAll()}
            disabled={busy}
          >
            Ripristina base
          </button>
        )}
        {error && (
          <span style={{ color: "var(--color-accent-2-700)", fontSize: 12, marginLeft: 6 }}>
            {error}
          </span>
        )}
      </td>
    </tr>
  );
}
