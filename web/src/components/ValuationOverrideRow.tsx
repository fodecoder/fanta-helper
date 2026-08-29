import { useState } from "react";
import type { ValuationWithPlayer } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import { ValuationsApiError } from "../api/valuations";
import { roleColor } from "../lib/auctionDerivations";

type AmountField = "target" | "fair_value" | "max_bid" | "panic_price";

interface ValuationOverrideRowProps {
  leagueId: number;
  // Riga NON riscalata: valori su base 1000 crediti, già coalesced (override → base).
  valuation: ValuationWithPlayer;
  factor: number;
  purchased: boolean;
  onSaved: () => void;
}

// Mostra i valori riscalati per il budget di lega (come il resto della
// pagina) ma li salva riconvertiti sulla base 1000, così l'override vive
// nella stessa unità del listino condiviso.
function toDisplay(base1000: number, factor: number): number {
  return factor === 1 ? base1000 : Math.round(base1000 * factor);
}
function toBase(display: number, factor: number): number {
  return factor === 1 ? display : Math.round(display / factor);
}

export function ValuationOverrideRow({
  leagueId,
  valuation: v,
  factor,
  purchased,
  onSaved,
}: ValuationOverrideRowProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambia a ogni salvataggio: rimonta gli input non controllati con i nuovi
  // defaultValue, evitando di specchiare lo stato del server in un useEffect.
  const [rev, setRev] = useState(0);

  const isOverridden = (field: AmountField | "note") => v.override?.[field] != null;

  async function save(patch: Parameters<typeof valuationsApi.upsertValuationOverride>[2]) {
    setBusy(true);
    setError(null);
    try {
      await valuationsApi.upsertValuationOverride(leagueId, v.player_id, patch);
      setRev((r) => r + 1);
      onSaved();
    } catch (err) {
      setError(err instanceof ValuationsApiError ? err.payload.error.message : "salvataggio fallito");
    } finally {
      setBusy(false);
    }
  }

  function commitAmount(field: AmountField, raw: string) {
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
    const trimmed = raw.trim();
    if (trimmed === (v.note ?? "")) return;
    void save({ note: trimmed === "" ? null : trimmed });
  }

  async function resetAll() {
    setBusy(true);
    setError(null);
    try {
      await valuationsApi.resetValuationOverride(leagueId, v.player_id);
      setRev((r) => r + 1);
      onSaved();
    } catch (err) {
      setError(err instanceof ValuationsApiError ? err.payload.error.message : "ripristino fallito");
    } finally {
      setBusy(false);
    }
  }

  const cellInput = (field: AmountField) => (
    <input
      key={`${field}-${rev}`}
      className="input"
      inputMode="numeric"
      style={{
        width: 74,
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
  );

  return (
    <tr style={purchased ? { opacity: 0.5 } : undefined}>
      <td style={{ whiteSpace: "nowrap" }}>{v.name}</td>
      <td>{v.team}</td>
      <td style={{ color: roleColor(v.ruolo) }}>{v.ruolo}</td>
      <td style={{ fontWeight: 600, color: "var(--color-accent-700)" }}>{v.tier}</td>
      <td style={{ textAlign: "right" }}>{cellInput("target")}</td>
      <td style={{ textAlign: "right" }}>{cellInput("fair_value")}</td>
      <td style={{ textAlign: "right" }}>{cellInput("max_bid")}</td>
      <td style={{ textAlign: "right" }}>{cellInput("panic_price")}</td>
      <td>
        <span className={v.confidence === "high" ? "tag tag-accent" : "tag tag-neutral"}>
          {v.confidence}
        </span>
      </td>
      <td>
        <input
          key={`note-${rev}`}
          className="input"
          style={{
            width: 160,
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
      </td>
      <td>
        {v.override !== null && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "2px 10px", fontSize: 12 }}
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
