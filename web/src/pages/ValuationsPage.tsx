import { useEffect, useMemo, useState } from "react";
import type { League, ValuationWithPlayer } from "@fanta-helper/shared";
import { ROLES, valuationScaleFactor, type Role } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import * as purchasesApi from "../api/purchases";
import { ValuationImportForm } from "../components/ValuationImportForm";
import { ValuationGenerateForm } from "../components/ValuationGenerateForm";
import { ValuationOverrideRow } from "../components/ValuationOverrideRow";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";

interface ValuationsPageProps {
  league: League;
  calls: number | null;
}

type RoleFilter = "tutti" | Role;

export function ValuationsPage({ league, calls }: ValuationsPageProps) {
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("tutti");

  useEffect(() => {
    const controller = new AbortController();
    valuationsApi
      .listValuations(league.id, controller.signal)
      .then((data) => {
        setValuations(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento valutazioni fallito");
      });
    void purchasesApi
      .listPurchases(league.id, controller.signal)
      .then((rows) => setPurchasedIds(new Set(rows.map((r) => r.player_id))))
      .catch(() => setPurchasedIds(new Set()));
    return () => controller.abort();
  }, [league.id, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  // Le valutazioni importate sono su base 1000 crediti: la tabella qui sotto
  // mostra i valori riscalati per il budget reale della lega, il dato
  // salvato resta quello importato (vedi shared/src/valuationScale.ts).
  const valuationScale = valuationScaleFactor(league.budget);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (valuations ?? [])
      .filter((v) => roleFilter === "tutti" || v.ruolo === roleFilter)
      .filter(
        (v) => q === "" || v.name.toLowerCase().includes(q) || v.team.toLowerCase().includes(q),
      );
  }, [valuations, query, roleFilter]);

  return (
    <>
      <PageMasthead
        kicker="Configurazione · listino della lega"
        title="Valutazioni"
        subtitle="Il listino della lega: tier, target, fair value, max bid e panic price per ogni giocatore. Genera con Claude a chunk per ruolo, oppure importa un JSON già pronto. Niente viene salvato prima della revisione. I valori numerici e la nota sono editabili inline: la modifica diventa un override personale (visibile solo a te), la base condivisa resta invariata."
        calls={calls}
      />

      <ValuationGenerateForm leagueId={league.id} onResolved={refresh} />
      <ValuationImportForm leagueId={league.id} leagueName={league.name} onResolved={refresh} />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          margin: "40px 0 12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Valutazioni correnti</h3>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {filtered.length} righe
          {valuationScale !== 1 &&
            ` · valori su base 1000 crediti, riscalati ×${valuationScale.toFixed(2)} per il budget di lega (${league.budget})`}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="cerca nome o squadra"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="seg" role="group" aria-label="Filtro ruolo">
            {(["tutti", ...ROLES] as RoleFilter[]).map((r) => (
              <button
                key={r}
                type="button"
                className="seg-opt"
                aria-pressed={roleFilter === r}
                onClick={() => setRoleFilter(r)}
              >
                {r === "tutti" ? "Tutti" : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : valuations === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : valuations.length === 0 ? (
        <StatusMessage kind="empty">Nessuna valutazione importata.</StatusMessage>
      ) : (
        <div className="table-scroll">
          <table className="table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Tier</th>
                <th style={{ textAlign: "right" }}>Target</th>
                <th style={{ textAlign: "right" }}>Fair value</th>
                <th style={{ textAlign: "right" }}>Max bid</th>
                <th style={{ textAlign: "right" }}>Panic price</th>
                <th>Confidence</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <ValuationOverrideRow
                  key={v.player_id}
                  leagueId={league.id}
                  valuation={v}
                  factor={valuationScale}
                  purchased={purchasedIds.has(v.player_id)}
                  onSaved={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
