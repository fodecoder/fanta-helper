import { useEffect, useMemo, useState } from "react";
import type { League, PurchaseWithDetails } from "@fanta-helper/shared";
import { PurchaseForm } from "../components/PurchaseForm";
import { PurchaseLog } from "../components/PurchaseLog";
import { AuctionStatusPanel } from "../components/AuctionStatusPanel";
import * as purchasesApi from "../api/purchases";

interface AuctionPageProps {
  league: League;
  onBack: () => void;
}

export function AuctionPage({ league, onBack }: AuctionPageProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    purchasesApi
      .listPurchases(league.id, controller.signal)
      .then((data) => {
        setPurchases(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "failed to load purchases");
      });
    return () => controller.abort();
  }, [league.id, refreshToken]);

  const purchasedPlayerIds = useMemo(
    () => new Set((purchases ?? []).map((purchase) => purchase.player_id)),
    [purchases],
  );

  return (
    <section>
      <button type="button" onClick={onBack}>
        Torna alle leghe
      </button>
      <h1>Asta — {league.name}</h1>

      <PurchaseForm
        leagueId={league.id}
        purchasedPlayerIds={purchasedPlayerIds}
        onSaved={() => setRefreshToken((t) => t + 1)}
      />

      <AuctionStatusPanel leagueId={league.id} refreshToken={refreshToken} />

      <PurchaseLog
        leagueId={league.id}
        purchases={purchases}
        loadError={loadError}
        onUndone={() => setRefreshToken((t) => t + 1)}
      />
    </section>
  );
}
