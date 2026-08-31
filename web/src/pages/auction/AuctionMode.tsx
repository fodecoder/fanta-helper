import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GkPairingEntry,
  League,
  Manager,
  ManagerAuctionStatus,
  Player,
  PlayerAttributes,
  PlayerLatestSeasonStats,
  PlayerRecommendationWithTags,
  PlayerTag,
  ProbableLineupEntry,
  PurchaseWithDetails,
  QuotationRow,
  SetPieceTakerEntry,
  StatsEnrichmentResponse,
  ValuationWithPlayer,
  WishlistEntryWithPlayer,
  Role,
} from "@fanta-helper/shared";
import * as purchasesApi from "../../api/purchases";
import { PurchasesApiError } from "../../api/purchases";
import * as wishlistApi from "../../api/wishlist";
import * as playersApi from "../../api/players";
import * as valuationsApi from "../../api/valuations";
import * as quotationApi from "../../api/quotation";
import * as managersApi from "../../api/managers";
import * as statsEnrichmentApi from "../../api/statsEnrichment";
import * as playerSeasonStatsApi from "../../api/playerSeasonStats";
import * as probableLineupApi from "../../api/probableLineup";
import * as setPieceTakerApi from "../../api/setPieceTaker";
import * as gkPairingApi from "../../api/gkPairing";
import * as recommendationsApi from "../../api/recommendations";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import {
  fvmScaleFactor,
  normalizeScoresByRole,
  scaleFvm,
  scaleValuationAmounts,
  valuationScaleFactor,
} from "@fanta-helper/shared";
import {
  gkPairingSuggestionFor,
  impact as computeImpact,
  ladderModel,
  rankSameRole,
  verdict as computeVerdict,
  type CompareSortKey,
  type GkPairingSuggestion,
  type RankRow,
} from "../../lib/auctionDerivations";
import { AuctionDesktop } from "./AuctionDesktop";
import { AuctionPhone } from "./AuctionPhone";

interface AuctionModeProps {
  league: League;
  onExit: () => void;
}

export type RoleFilter = "tutti" | Role;
export type PlayerSortKey = "valore" | "fvm" | "qt_a" | "qt_i";

// Almeno 10 alternative visibili come richiesto; 15 lascia un margine senza
// affollare la tabella (se il ruolo ne ha meno disponibili, mostra tutte).
const COMPARE_ROWS = 15;

export interface CompareRow extends RankRow {
  delta: number | null;
  isCurrent: boolean;
  quotation: QuotationRow | undefined;
  seasonStats: PlayerLatestSeasonStats | undefined;
  // `score` = score grezzo VORP (usato per l'ordinamento «per score»);
  // `displayScore` = stesso score in scala 0–10 per ruolo (solo lettura).
  score: number | null;
  displayScore: number | null;
  tags: PlayerTag[];
  teamPref: "prefer" | "avoid" | null;
}

// Modello di vista condiviso tra desktop e telefono: tutto derivato, nulla di
// duplicato. Lo stato dell'asta resta funzione del log (purchases + state dal
// server), il max bid rettificato viene da `adjustedMaxBid`.
export interface AuctionView {
  league: League;
  onExit: () => void;
  bumps: number[];

  managers: Manager[];
  statuses: ManagerAuctionStatus[] | null;
  me: ManagerAuctionStatus | undefined;
  selectedManagerId: number | null;
  onSelectManager: (id: number) => void;

  visiblePlayers: Player[];
  availableCount: number;
  callsLabel: string;
  query: string;
  onQuery: (q: string) => void;
  roleFilter: RoleFilter;
  onRoleFilter: (r: RoleFilter) => void;
  sortKey: PlayerSortKey;
  onSortKey: (k: PlayerSortKey) => void;

  selectedPlayer: Player | undefined;
  selectedValuation: ValuationWithPlayer | undefined;
  wishlistPlayerIds: Set<number>;
  valuationFor: (playerId: number) => ValuationWithPlayer | undefined;
  quotationFor: (playerId: number) => QuotationRow | undefined;
  weightedFvmFor: (playerId: number) => number | null;
  sortValueFor: (playerId: number) => number | null;
  tagsFor: (playerId: number) => PlayerTag[];
  teamPrefFor: (playerId: number) => "prefer" | "avoid" | null;
  normalizedScoreFor: (playerId: number) => number | null;
  recommendationFor: (playerId: number) => PlayerRecommendationWithTags | undefined;

  price: string;
  priceNum: number | null;
  onPrice: (v: string) => void;
  onBump: (delta: number) => void;
  verdict: ReturnType<typeof computeVerdict>;
  ladder: ReturnType<typeof ladderModel>;
  impact: ReturnType<typeof computeImpact>;

  compareRows: CompareRow[];
  compareMaxFv: number;
  compareSortKey: CompareSortKey;
  onCompareSortKey: (k: CompareSortKey) => void;
  compareSortValueFor: (playerId: number) => number | null;
  enrichment: StatsEnrichmentResponse | null;
  attributesFor: (playerId: number) => PlayerAttributes | undefined;
  seasonStatsById: Map<number, PlayerLatestSeasonStats>;
  probableLineup: ProbableLineupEntry[] | null;
  setPieceTakers: SetPieceTakerEntry[] | null;
  gkPairingSuggestion: GkPairingSuggestion | null;

  logRows: {
    key: string;
    name: string;
    manager: string;
    prezzo: number;
    delta: number | null;
    ruolo: Role;
  }[];
  wishRows: {
    player_id: number;
    name: string;
    ruolo: Role;
    tier: string | null;
    fv: number | null;
  }[];

  assignError: string | null;
  canAssign: boolean;
  onAssign: () => void;
  onSelect: (playerId: number) => void;
  onToggleWishlist: (playerId: number) => void;
  onUndo: () => void;
}

export function AuctionMode({ league, onExit }: AuctionModeProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[] | null>(null);
  const [statuses, setStatuses] = useState<ManagerAuctionStatus[] | null>(null);
  const [wishlist, setWishlist] = useState<WishlistEntryWithPlayer[] | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [quotations, setQuotations] = useState<QuotationRow[] | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [enrichment, setEnrichment] = useState<StatsEnrichmentResponse | null>(null);
  const [seasonStats, setSeasonStats] = useState<PlayerLatestSeasonStats[] | null>(null);
  const [probableLineup, setProbableLineup] = useState<ProbableLineupEntry[] | null>(null);
  const [setPieceTakers, setSetPieceTakers] = useState<SetPieceTakerEntry[] | null>(null);
  const [gkPairing, setGkPairing] = useState<GkPairingEntry[] | null>(null);
  const [recommendations, setRecommendations] = useState<PlayerRecommendationWithTags[] | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("tutti");
  const [sortKey, setSortKey] = useState<PlayerSortKey>("valore");
  const [compareSortKey, setCompareSortKey] = useState<CompareSortKey>("fair_value");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const isPhone = useMediaQuery(MOBILE_QUERY);

  useEffect(() => {
    const controller = new AbortController();
    void purchasesApi
      .listPurchases(league.id, controller.signal)
      .then(setPurchases)
      .catch(() => {});
    void purchasesApi
      .getAuctionState(league.id, controller.signal)
      .then(setStatuses)
      .catch(() => {});
    void wishlistApi
      .listWishlist(league.id, controller.signal)
      .then(setWishlist)
      .catch(() => {});
    void valuationsApi
      .listValuations(league.id, controller.signal)
      .then(setValuations)
      .catch(() => {});
    void recommendationsApi
      .listRecommendations(league.id, controller.signal)
      .then(setRecommendations)
      .catch(() => {});
    return () => controller.abort();
  }, [league.id, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    void playersApi
      .listPlayers(controller.signal)
      .then(setPlayers)
      .catch(() => {});
    void managersApi
      .listManagers(league.id, controller.signal)
      .then(setManagers)
      .catch(() => {});
    void quotationApi
      .listCurrentQuotations(controller.signal)
      .then(setQuotations)
      .catch(() => {});
    void probableLineupApi
      .listProbableLineup(controller.signal)
      .then(setProbableLineup)
      .catch(() => {});
    void setPieceTakerApi
      .listSetPieceTakers(controller.signal)
      .then(setSetPieceTakers)
      .catch(() => {});
    void gkPairingApi
      .listGkPairing(controller.signal)
      .then(setGkPairing)
      .catch(() => {});
    return () => controller.abort();
  }, [league.id]);

  const purchasedPlayerIds = useMemo(
    () => new Set((purchases ?? []).map((p) => p.player_id)),
    [purchases],
  );
  const wishlistPlayerIds = useMemo(
    () => new Set((wishlist ?? []).map((e) => e.player_id)),
    [wishlist],
  );
  // Le valutazioni importate sono su base 1000 crediti (vedi
  // shared/src/valuationScale.ts): si riscalano qui, una sola volta, per il
  // budget reale della lega — il dato salvato in `valuation` resta intatto.
  const valuationScale = valuationScaleFactor(league.budget);
  // L'FVM di listino è su base 500 crediti (vedi valuationScale.ts), base
  // diversa da quella delle valutazioni: quando è mostrato come prezzo va
  // riscalato al budget reale della lega. Solo display, a valle dei tag.
  const fvmScale = fvmScaleFactor(league.budget);
  const scaledValuations = useMemo(
    () => (valuations ?? []).map((v) => scaleValuationAmounts(v, valuationScale)),
    [valuations, valuationScale],
  );
  const valuationById = useMemo(() => {
    const map = new Map<number, ValuationWithPlayer>();
    for (const v of scaledValuations) map.set(v.player_id, v);
    return map;
  }, [scaledValuations]);
  const valuationFor = useCallback((id: number) => valuationById.get(id), [valuationById]);
  const quotationById = useMemo(() => {
    const map = new Map<number, QuotationRow>();
    for (const q of quotations ?? []) map.set(q.player_id, q);
    return map;
  }, [quotations]);
  const quotationFor = useCallback((id: number) => quotationById.get(id), [quotationById]);
  // FVM di listino riscalato al budget di lega (base 500). `null` se assente.
  const weightedFvmFor = useCallback(
    (id: number): number | null => {
      const raw = quotationById.get(id)?.fvm;
      return raw == null ? null : scaleFvm(raw, fvmScale);
    },
    [quotationById, fvmScale],
  );
  const recommendationById = useMemo(() => {
    const map = new Map<number, PlayerRecommendationWithTags>();
    for (const r of recommendations ?? []) map.set(r.player_id, r);
    return map;
  }, [recommendations]);
  const tagsFor = useCallback(
    (playerId: number): PlayerTag[] => recommendationById.get(playerId)?.tags ?? [],
    [recommendationById],
  );
  const teamPrefFor = useCallback(
    (playerId: number): "prefer" | "avoid" | null =>
      recommendationById.get(playerId)?.teamPref ?? null,
    [recommendationById],
  );
  const recommendationFor = useCallback(
    (playerId: number) => recommendationById.get(playerId),
    [recommendationById],
  );
  // Scala 0–10 per ruolo, calcolata sull'intero pool di raccomandazioni (prima
  // di qualsiasi slice per ruolo/filtri). Solo presentazione.
  const normalizedScoreById = useMemo(
    () => normalizeScoresByRole(recommendations ?? []),
    [recommendations],
  );
  const normalizedScoreFor = useCallback(
    (playerId: number): number | null => normalizedScoreById.get(playerId) ?? null,
    [normalizedScoreById],
  );
  // Chiave attiva = criterio di ordinamento e stesso valore mostrato in lista.
  const sortValueFor = useCallback(
    (playerId: number): number | null => {
      if (sortKey === "valore") return valuationById.get(playerId)?.fair_value ?? null;
      if (sortKey === "fvm") return weightedFvmFor(playerId);
      return quotationById.get(playerId)?.[sortKey] ?? null;
    },
    [sortKey, valuationById, quotationById, weightedFvmFor],
  );

  const ownerManagerId = useMemo(
    () => managers.find((m) => m.is_owner)?.id ?? managers[0]?.id ?? null,
    [managers],
  );
  // Manager selezionato = scelta esplicita, altrimenti il proprietario ("Io").
  const effectiveManagerId = selectedManagerId ?? ownerManagerId;

  const visiblePlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (players ?? [])
      .filter((p) => !purchasedPlayerIds.has(p.id))
      .filter((p) => roleFilter === "tutti" || p.ruolo === roleFilter)
      .filter(
        (p) => q === "" || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q),
      )
      .sort((a, b) => (sortValueFor(b.id) ?? -1) - (sortValueFor(a.id) ?? -1));
  }, [players, purchasedPlayerIds, roleFilter, query, sortValueFor]);

  const selectedPlayer = players?.find((p) => p.id === selectedPlayerId);
  const selectedValuation =
    selectedPlayerId != null ? valuationById.get(selectedPlayerId) : undefined;
  const priceNum = price === "" ? null : Number(price);
  const validPrice = priceNum !== null && Number.isInteger(priceNum) && priceNum >= 0;

  const me = statuses?.find((s) => s.isOwner);
  const selectedManagerStatus = statuses?.find((s) => s.managerId === effectiveManagerId);

  // Squadre dei portieri già presi dal manager owner, in ordine di acquisto:
  // riferimento per il suggerimento di accoppiata (ultimo acquistato = squadra
  // di riferimento).
  const myGoalkeeperTeams = useMemo(
    () =>
      (purchases ?? [])
        .filter((p) => p.manager_id === me?.managerId && p.player_ruolo === "P")
        .map((p) => p.player_team),
    [purchases, me?.managerId],
  );
  const isTeamGoalkeeperAvailable = useCallback(
    (team: string) =>
      (players ?? []).some(
        (p) => p.team === team && p.ruolo === "P" && !purchasedPlayerIds.has(p.id),
      ),
    [players, purchasedPlayerIds],
  );
  const gkPairingSuggestion = useMemo(
    () => gkPairingSuggestionFor(myGoalkeeperTeams, gkPairing ?? [], isTeamGoalkeeperAvailable),
    [myGoalkeeperTeams, gkPairing, isTeamGoalkeeperAvailable],
  );

  const verdict = computeVerdict(priceNum, selectedValuation);
  const ladder = ladderModel(selectedValuation, priceNum);
  const impact = selectedPlayer
    ? computeImpact(priceNum, selectedManagerStatus, selectedPlayer.ruolo)
    : { text: "", color: "var(--color-neutral-700)" };

  const seasonStatsById = useMemo(() => {
    const map = new Map<number, PlayerLatestSeasonStats>();
    for (const s of seasonStats ?? []) map.set(s.player_id, s);
    return map;
  }, [seasonStats]);

  const attributesById = useMemo(() => {
    const map = new Map<number, PlayerAttributes>();
    for (const a of enrichment?.attributes.stats ?? []) map.set(a.player_id, a);
    return map;
  }, [enrichment]);
  const attributesFor = useCallback(
    (playerId: number) => attributesById.get(playerId),
    [attributesById],
  );

  const compareSortValueFor = useCallback(
    (playerId: number): number | null => {
      switch (compareSortKey) {
        case "fair_value":
          return valuationById.get(playerId)?.fair_value ?? null;
        case "target":
          return valuationById.get(playerId)?.target ?? null;
        case "max_bid":
          return valuationById.get(playerId)?.max_bid ?? null;
        case "fm":
          return seasonStatsById.get(playerId)?.fm ?? null;
        case "fvm":
          return weightedFvmFor(playerId);
        case "qt_a":
          return quotationById.get(playerId)?.qt_a ?? null;
        case "score":
          return recommendationById.get(playerId)?.score ?? null;
      }
    },
    [compareSortKey, valuationById, quotationById, seasonStatsById, recommendationById, weightedFvmFor],
  );

  const compareBase = useMemo(() => {
    if (!selectedPlayer || !players || !valuations) return [] as RankRow[];
    return rankSameRole(
      players,
      scaledValuations,
      purchasedPlayerIds,
      selectedPlayer.ruolo,
      compareSortValueFor,
    )
      .filter((row) => row.player.id !== selectedPlayer.id)
      .slice(0, COMPARE_ROWS);
  }, [selectedPlayer, players, valuations, scaledValuations, purchasedPlayerIds, compareSortValueFor]);

  const compareRows: CompareRow[] = compareBase.map((row) => ({
    ...row,
    isCurrent: row.player.id === selectedPlayer?.id,
    delta:
      selectedValuation && row.valuation
        ? row.valuation.fair_value - selectedValuation.fair_value
        : null,
    quotation: quotationById.get(row.player.id),
    seasonStats: seasonStatsById.get(row.player.id),
    score: recommendationById.get(row.player.id)?.score ?? null,
    displayScore: normalizedScoreById.get(row.player.id) ?? null,
    tags: recommendationById.get(row.player.id)?.tags ?? [],
    teamPref: recommendationById.get(row.player.id)?.teamPref ?? null,
  }));
  const compareMaxFv = Math.max(1, ...compareBase.map((r) => r.valuation?.fair_value ?? 0));

  // Arricchimento stat opzionale per le alternative (gated su `enabled`).
  useEffect(() => {
    if (compareBase.length === 0) return;
    const controller = new AbortController();
    statsEnrichmentApi
      .getStatsEnrichment(
        compareBase.map((r) => r.player.id),
        controller.signal,
      )
      .then(setEnrichment)
      .catch(() => setEnrichment(null));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.id, players, valuations, purchasedPlayerIds, compareSortKey]);

  // Statistiche stagionali per l'intero pool disponibile dello stesso ruolo
  // del giocatore in asta (non solo le righe poi mostrate): servono a
  // ordinare per Fm su tutti i candidati, altrimenti la maggior parte del
  // pool risulterebbe senza dato.
  useEffect(() => {
    if (!selectedPlayer || !players) return;
    const ids = new Set(
      players
        .filter((p) => p.ruolo === selectedPlayer.ruolo && !purchasedPlayerIds.has(p.id))
        .map((p) => p.id),
    );
    ids.add(selectedPlayer.id);
    const controller = new AbortController();
    playerSeasonStatsApi
      .getLatestPlayerSeasonStats(Array.from(ids), controller.signal)
      .then(setSeasonStats)
      .catch(() => setSeasonStats(null));
    return () => controller.abort();
  }, [selectedPlayer, players, purchasedPlayerIds]);

  const logRows = (purchases ?? [])
    .slice()
    .reverse()
    .slice(0, 7)
    .map((p) => {
      const val = valuationById.get(p.player_id);
      return {
        key: `${p.league_id}-${p.player_id}`,
        name: p.player_name,
        manager: p.manager_name,
        prezzo: p.prezzo,
        delta: val ? p.prezzo - val.fair_value : null,
        ruolo: p.player_ruolo,
      };
    });

  const wishRows = (wishlist ?? [])
    .filter((e) => !purchasedPlayerIds.has(e.player_id))
    .map((e) => {
      const val = valuationById.get(e.player_id);
      return {
        player_id: e.player_id,
        name: e.name,
        ruolo: e.ruolo,
        tier: val?.tier ?? null,
        fv: val?.fair_value ?? null,
      };
    });

  const onSelect = useCallback((playerId: number) => {
    setSelectedPlayerId(playerId);
    setPrice("");
    setAssignError(null);
  }, []);

  const onBump = useCallback((delta: number) => {
    setPrice((prev) => String(Math.max(0, (prev === "" ? 0 : Number(prev)) + delta)));
  }, []);

  const refresh = () => setRefreshToken((t) => t + 1);

  const onAssign = useCallback(async () => {
    if (selectedPlayerId === null || effectiveManagerId === null || !validPrice) return;
    setAssignError(null);
    // Prossimo libero dopo l'assegnazione (escludendo quello appena assegnato).
    const nextId = visiblePlayers.find((p) => p.id !== selectedPlayerId)?.id ?? null;
    try {
      await purchasesApi.createPurchase(league.id, {
        player_id: selectedPlayerId,
        manager_id: effectiveManagerId,
        prezzo: priceNum!,
      });
      setSelectedPlayerId(nextId);
      setPrice("");
      refresh();
    } catch (err) {
      setAssignError(
        err instanceof PurchasesApiError ? err.payload.error.message : "assegnazione fallita",
      );
    }
  }, [selectedPlayerId, effectiveManagerId, validPrice, priceNum, league.id, visiblePlayers]);

  const onToggleWishlist = useCallback(
    async (playerId: number) => {
      try {
        if (wishlistPlayerIds.has(playerId)) {
          await wishlistApi.removeFromWishlist(league.id, playerId);
        } else {
          await wishlistApi.addToWishlist(league.id, playerId);
        }
        refresh();
      } catch {
        // La wishlist è di supporto: un errore non interrompe la chiamata.
      }
    },
    [wishlistPlayerIds, league.id],
  );

  const onUndo = useCallback(async () => {
    if ((purchases?.length ?? 0) === 0) return;
    if (
      !window.confirm(
        "Annullare l'ultima chiamata? Il log è immutabile: usalo solo per correggere un errore.",
      )
    ) {
      return;
    }
    try {
      await purchasesApi.deleteLastPurchase(league.id);
      refresh();
    } catch {
      // ignora: il log resta invariato
    }
  }, [purchases, league.id]);

  // Tastiera: ↑/↓ selezione, Invio assegna, Esc esce.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (visiblePlayers.length === 0) return;
        e.preventDefault();
        const i = visiblePlayers.findIndex((p) => p.id === selectedPlayerId);
        const next =
          e.key === "ArrowDown" ? Math.min(visiblePlayers.length - 1, i + 1) : Math.max(0, i - 1);
        const target = visiblePlayers[i === -1 ? 0 : next];
        if (target) onSelect(target.id);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        void onAssign();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visiblePlayers, selectedPlayerId, onExit, onSelect, onAssign]);

  const view: AuctionView = {
    league,
    onExit,
    bumps: [-5, -1, 1, 5],
    managers,
    statuses,
    me,
    selectedManagerId: effectiveManagerId,
    onSelectManager: setSelectedManagerId,
    visiblePlayers,
    availableCount: (players?.length ?? 0) - purchasedPlayerIds.size,
    callsLabel: `${purchases?.length ?? 0} chiamate`,
    query,
    onQuery: setQuery,
    roleFilter,
    onRoleFilter: setRoleFilter,
    sortKey,
    onSortKey: setSortKey,
    selectedPlayer,
    selectedValuation,
    wishlistPlayerIds,
    valuationFor,
    quotationFor,
    weightedFvmFor,
    sortValueFor,
    tagsFor,
    teamPrefFor,
    normalizedScoreFor,
    recommendationFor,
    price,
    priceNum,
    onPrice: (v) => {
      setPrice(v);
      setAssignError(null);
    },
    onBump,
    verdict,
    ladder,
    impact,
    compareRows,
    compareMaxFv,
    compareSortKey,
    onCompareSortKey: setCompareSortKey,
    compareSortValueFor,
    enrichment,
    attributesFor,
    seasonStatsById,
    probableLineup,
    setPieceTakers,
    gkPairingSuggestion,
    logRows,
    wishRows,
    assignError,
    canAssign: selectedPlayerId !== null && effectiveManagerId !== null && validPrice,
    onAssign: () => void onAssign(),
    onSelect,
    onToggleWishlist: (id) => void onToggleWishlist(id),
    onUndo: () => void onUndo(),
  };

  return isPhone ? <AuctionPhone view={view} /> : <AuctionDesktop view={view} />;
}
