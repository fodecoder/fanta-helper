import { useEffect, useMemo, useState } from "react";
import type { League, ValuationWithPlayer } from "@fanta-helper/shared";
import { ROLES, type Role } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import * as purchasesApi from "../api/purchases";
import { ValuationImportForm } from "../components/ValuationImportForm";
import { ValuationGenerateForm } from "../components/ValuationGenerateForm";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";
import { roleColor } from "../lib/auctionDerivations";

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
        subtitle="Il listino della lega: tier, target, fair value, max bid e panic price per ogni giocatore. Genera con Claude a chunk per ruolo, oppure importa un JSON già pronto. Niente viene salvato prima della revisione."
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
          <table className="table" style={{ minWidth: 780 }}>
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.player_id}
                  style={purchasedIds.has(v.player_id) ? { opacity: 0.5 } : undefined}
                >
                  <td style={{ whiteSpace: "nowrap" }}>{v.name}</td>
                  <td>{v.team}</td>
                  <td style={{ color: roleColor(v.ruolo) }}>{v.ruolo}</td>
                  <td style={{ fontWeight: 600, color: "var(--color-accent-700)" }}>{v.tier}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {v.target}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                    {v.fair_value}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {v.max_bid}
                  </td>
                  <td
                    className="num"
                    style={{ textAlign: "right", color: "var(--color-neutral-700)" }}
                  >
                    {v.panic_price}
                  </td>
                  <td>
                    <span
                      className={v.confidence === "high" ? "tag tag-accent" : "tag tag-neutral"}
                    >
                      {v.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
