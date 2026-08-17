import { useEffect, useState } from "react";
import type { League, ValuationWithPlayer } from "@fanta-helper/shared";
import { ValuationImportForm } from "../components/ValuationImportForm";
import * as valuationsApi from "../api/valuations";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { PlayerAvatar } from "../components/PlayerAvatar";

interface ValuationsPageProps {
  league: League;
  onBack: () => void;
}

export function ValuationsPage({ league, onBack }: ValuationsPageProps) {
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

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
        setLoadError(err instanceof Error ? err.message : "failed to load valuations");
      });
    return () => controller.abort();
  }, [league.id, refreshToken]);

  return (
    <div className="page">
      <PageHeader title={`Valutazioni — ${league.name}`} onBack={onBack} />

      <ValuationImportForm leagueId={league.id} onResolved={() => setRefreshToken((t) => t + 1)} />

      <section className="card">
        <h2>Valutazioni correnti</h2>
        {loadError ? (
          <StatusMessage kind="error">{loadError}</StatusMessage>
        ) : valuations === null ? (
          <StatusMessage kind="loading">Caricamento…</StatusMessage>
        ) : valuations.length === 0 ? (
          <StatusMessage kind="empty">Nessuna valutazione importata.</StatusMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Nome</th>
                  <th>Squadra</th>
                  <th>Ruolo</th>
                  <th>Tier</th>
                  <th className="num">Target</th>
                  <th className="num">Fair value</th>
                  <th className="num">Max bid</th>
                  <th className="num">Panic price</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {valuations.map((valuation) => (
                  <tr key={valuation.player_id}>
                    <td>
                      <PlayerAvatar
                        name={valuation.name}
                        team={valuation.team}
                        ruolo={valuation.ruolo}
                        image_url={valuation.image_url}
                        size="sm"
                      />
                    </td>
                    <td>{valuation.name}</td>
                    <td>{valuation.team}</td>
                    <td>{valuation.ruolo}</td>
                    <td>{valuation.tier}</td>
                    <td className="num">{valuation.target}</td>
                    <td className="num">{valuation.fair_value}</td>
                    <td className="num">{valuation.max_bid}</td>
                    <td className="num">{valuation.panic_price}</td>
                    <td>{valuation.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
