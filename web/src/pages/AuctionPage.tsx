import { useEffect, useMemo, useState } from "react";
import type {
  League,
  ManagerAuctionStatus,
  PurchaseWithDetails,
  WishlistEntryWithPlayer,
} from "@fanta-helper/shared";
import { PurchaseForm } from "../components/PurchaseForm";
import { PurchaseLog } from "../components/PurchaseLog";
import { AuctionStatusPanel } from "../components/AuctionStatusPanel";
import { WishlistPanel } from "../components/WishlistPanel";
import { GoalkeeperGridTable } from "../components/GoalkeeperGridTable";
import * as purchasesApi from "../api/purchases";
import * as wishlistApi from "../api/wishlist";
import { PageHeader } from "../components/PageHeader";

interface AuctionPageProps {
  league: League;
  onBack: () => void;
}

export function AuctionPage({ league, onBack }: AuctionPageProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<ManagerAuctionStatus[] | null>(null);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistEntryWithPlayer[] | null>(null);
  const [wishlistLoadError, setWishlistLoadError] = useState<string | null>(null);
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

  useEffect(() => {
    const controller = new AbortController();
    purchasesApi
      .getAuctionState(league.id, controller.signal)
      .then((data) => {
        setStatuses(data);
        setStatusLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatusLoadError(err instanceof Error ? err.message : "failed to load auction state");
      });
    return () => controller.abort();
  }, [league.id, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    wishlistApi
      .listWishlist(league.id, controller.signal)
      .then((data) => {
        setWishlist(data);
        setWishlistLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setWishlistLoadError(err instanceof Error ? err.message : "failed to load wishlist");
      });
    return () => controller.abort();
  }, [league.id, refreshToken]);

  const purchasedPlayerIds = useMemo(
    () => new Set((purchases ?? []).map((purchase) => purchase.player_id)),
    [purchases],
  );

  const wishlistPlayerIds = useMemo(
    () => new Set((wishlist ?? []).map((entry) => entry.player_id)),
    [wishlist],
  );

  return (
    <div className="page">
      <PageHeader title={`Asta — ${league.name}`} onBack={onBack} />

      <PurchaseForm
        leagueId={league.id}
        purchasedPlayerIds={purchasedPlayerIds}
        wishlistPlayerIds={wishlistPlayerIds}
        statuses={statuses}
        onSaved={() => setRefreshToken((t) => t + 1)}
        onWishlistChanged={() => setRefreshToken((t) => t + 1)}
      />

      <WishlistPanel
        leagueId={league.id}
        wishlist={wishlist}
        loadError={wishlistLoadError}
        purchasedPlayerIds={purchasedPlayerIds}
        onChanged={() => setRefreshToken((t) => t + 1)}
      />

      <AuctionStatusPanel statuses={statuses} loadError={statusLoadError} />

      <PurchaseLog
        leagueId={league.id}
        purchases={purchases}
        loadError={loadError}
        onUndone={() => setRefreshToken((t) => t + 1)}
      />

      <details className="card">
        <summary>Griglia portieri (consultazione)</summary>
        <GoalkeeperGridTable />
      </details>
    </div>
  );
}
