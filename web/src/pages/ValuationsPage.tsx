import { useEffect, useState } from "react";
import type { League, ValuationWithPlayer } from "@fanta-helper/shared";
import { ValuationImportForm } from "../components/ValuationImportForm";
import * as valuationsApi from "../api/valuations";

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
    <section>
      <button type="button" onClick={onBack}>
        Indietro
      </button>
      <h1>Valutazioni — {league.name}</h1>

      <ValuationImportForm leagueId={league.id} onResolved={() => setRefreshToken((t) => t + 1)} />

      <h2>Valutazioni correnti</h2>
      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : valuations === null ? (
        <p>Caricamento…</p>
      ) : valuations.length === 0 ? (
        <p>Nessuna valutazione importata.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Squadra</th>
              <th>Ruolo</th>
              <th>Tier</th>
              <th>Target</th>
              <th>Fair value</th>
              <th>Max bid</th>
              <th>Panic price</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {valuations.map((valuation) => (
              <tr key={valuation.player_id}>
                <td>{valuation.name}</td>
                <td>{valuation.team}</td>
                <td>{valuation.ruolo}</td>
                <td>{valuation.tier}</td>
                <td>{valuation.target}</td>
                <td>{valuation.fair_value}</td>
                <td>{valuation.max_bid}</td>
                <td>{valuation.panic_price}</td>
                <td>{valuation.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
