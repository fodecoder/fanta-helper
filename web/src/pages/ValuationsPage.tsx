import { useEffect, useMemo, useState } from "react";
import type {
  League,
  PlayerRecommendationWithTags,
  TeamPref,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import { ROLES, normalizeScoresByRole, valuationScaleFactor, type Role } from "@fanta-helper/shared";
import * as valuationsApi from "../api/valuations";
import * as recommendationsApi from "../api/recommendations";
import * as teamPrefsApi from "../api/teamPrefs";
import * as playerTrapTagsApi from "../api/playerTrapTags";
import * as purchasesApi from "../api/purchases";
import { ValuationImportForm } from "../components/ValuationImportForm";
import { ValuationGenerateForm } from "../components/ValuationGenerateForm";
import { MergedValuationRow } from "../components/MergedValuationRow";
import { TeamPrefPanel } from "../components/TeamPrefPanel";
import { ScoreBreakdownDialog } from "../components/ScoreBreakdownDialog";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";
import { InfoLabel } from "../components/ui/InfoLabel";
import { COLUMN_GLOSSARY } from "../lib/columnGlossary";

interface ValuationsPageProps {
  league: League;
  calls: number | null;
}

type RoleFilter = "tutti" | Role | "trappole";

type SortKey =
  | "name"
  | "team"
  | "ruolo"
  | "score"
  | "tier"
  | "fm"
  | "reliability"
  | "qt_a"
  | "fvm"
  | "target"
  | "fair_value"
  | "max_bid"
  | "panic_price";

const STRING_SORT_KEYS: ReadonlySet<SortKey> = new Set(["name", "team", "ruolo", "tier"]);

export function ValuationsPage({ league, calls }: ValuationsPageProps) {
  const [recommendations, setRecommendations] = useState<PlayerRecommendationWithTags[] | null>(null);
  const [valuations, setValuations] = useState<ValuationWithPlayer[] | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [teamPrefs, setTeamPrefs] = useState<TeamPref[]>([]);
  const [trapTagIds, setTrapTagIds] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("tutti");
  const [detailPlayerId, setDetailPlayerId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: STRING_SORT_KEYS.has(key) ? "asc" : "desc" },
    );

  useEffect(() => {
    const controller = new AbortController();
    recommendationsApi
      .listRecommendations(league.id, controller.signal)
      .then((data) => {
        setRecommendations(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento consigli fallito");
      });
    valuationsApi
      .listValuations(league.id, controller.signal)
      .then(setValuations)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setValuations([]);
      });
    teamPrefsApi
      .listTeamPrefs(league.id, controller.signal)
      .then(setTeamPrefs)
      .catch(() => setTeamPrefs([]));
    playerTrapTagsApi
      .listPlayerTrapTags(league.id, controller.signal)
      .then((ids) => setTrapTagIds(new Set(ids)))
      .catch(() => setTrapTagIds(new Set()));
    void purchasesApi
      .listPurchases(league.id, controller.signal)
      .then((rows) => setPurchasedIds(new Set(rows.map((r) => r.player_id))))
      .catch(() => setPurchasedIds(new Set()));
    return () => controller.abort();
  }, [league.id, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  const toggleTrap = (playerId: number) => {
    const call = trapTagIds.has(playerId)
      ? playerTrapTagsApi.removePlayerTrapTag(league.id, playerId)
      : playerTrapTagsApi.addPlayerTrapTag(league.id, playerId);
    call.then(refresh).catch(refresh);
  };

  // Le valutazioni importate sono su base 1000 crediti: gli input mostrano i
  // valori riscalati per il budget reale della lega, il dato salvato resta
  // quello di listino (vedi shared/src/valuationScale.ts).
  const valuationScale = valuationScaleFactor(league.budget);

  const valuationByPlayer = useMemo(
    () => new Map((valuations ?? []).map((v) => [v.player_id, v])),
    [valuations],
  );

  const knownTeams = useMemo(
    () => [...new Set((recommendations ?? []).map((r) => r.team))],
    [recommendations],
  );

  const normById = useMemo(() => normalizeScoresByRole(recommendations ?? []), [recommendations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (recommendations ?? [])
      .filter((r) =>
        roleFilter === "tutti"
          ? true
          : roleFilter === "trappole"
            ? r.tags.some((t) => t.id === "trappola")
            : r.ruolo === roleFilter,
      )
      .filter(
        (r) => q === "" || r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q),
      );
  }, [recommendations, query, roleFilter]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, dir } = sort;
    const value = (r: PlayerRecommendationWithTags): string | number | null => {
      switch (key) {
        case "name":
          return r.name;
        case "team":
          return r.team;
        case "ruolo":
          return r.ruolo;
        case "score":
          return normById.get(r.player_id) ?? null;
        case "tier":
          return r.tier;
        case "fm":
          return r.components.fmScorsaStagione;
        case "reliability":
          return r.components.reliability;
        case "qt_a":
          return r.price.qt_a ?? null;
        case "fvm":
          return r.price.fvm ?? null;
        default: {
          const v = valuationByPlayer.get(r.player_id);
          return v ? v[key] : null;
        }
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, normById, valuationByPlayer]);

  const sortArrow = (key: SortKey) => (sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  const detailPlayer =
    detailPlayerId === null
      ? null
      : ((recommendations ?? []).find((r) => r.player_id === detailPlayerId) ?? null);

  return (
    <>
      <PageMasthead
        kicker="Asta · listino e motore di consiglio"
        title="Valutazioni"
        subtitle="Il ranking dei giocatori disponibili ordinato per valore sopra il rimpiazzo (VORP) sulle regole della lega, con accanto il listino: tier, target, fair value, max bid e panic price. I valori numerici e la nota sono editabili inline e diventano un override personale (visibile solo a te); la base condivisa resta invariata. Importa un JSON già pronto o genera con Claude dal pannello in alto a destra."
        calls={calls}
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? "Chiudi pannello" : "Importa / genera valutazioni"}
          </button>
        }
      />

      {panelOpen && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: 16,
            marginBottom: 28,
          }}
        >
          <ValuationGenerateForm leagueId={league.id} onResolved={refresh} />
          <div style={{ height: 24 }} />
          <ValuationImportForm leagueId={league.id} leagueName={league.name} onResolved={refresh} />
        </div>
      )}

      <TeamPrefPanel
        leagueId={league.id}
        teams={knownTeams}
        prefs={teamPrefs}
        onChanged={refresh}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          margin: "24px 0 12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Ranking disponibili</h3>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {filtered.length} giocatori
          {valuationScale !== 1 &&
            ` · valori di listino su base 1000 crediti, riscalati ×${valuationScale.toFixed(2)} per il budget di lega (${league.budget})`}
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
            {(["tutti", ...ROLES, "trappole"] as RoleFilter[]).map((r) => (
              <button
                key={r}
                type="button"
                className="seg-opt"
                aria-pressed={roleFilter === r}
                onClick={() => setRoleFilter(r)}
              >
                {r === "tutti" ? "Tutti" : r === "trappole" ? "Trappole" : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : recommendations === null || valuations === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : recommendations.length === 0 ? (
        <StatusMessage kind="empty">
          Nessun giocatore disponibile o dati storici assenti.
        </StatusMessage>
      ) : (
        <div className="table-scroll">
          <table className="table" style={{ minWidth: 1240 }}>
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>
                  Nome{sortArrow("name")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("team")}>
                  Squadra{sortArrow("team")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("ruolo")}>
                  Ruolo{sortArrow("ruolo")}
                </th>
                <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => toggleSort("score")}>
                  <InfoLabel {...COLUMN_GLOSSARY.score} />
                  {sortArrow("score")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("tier")}>
                  <InfoLabel {...COLUMN_GLOSSARY.tier} />
                  {sortArrow("tier")}
                </th>
                <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => toggleSort("fm")}>
                  <InfoLabel {...COLUMN_GLOSSARY.fm} />
                  {sortArrow("fm")}
                </th>
                <th
                  style={{ textAlign: "right", cursor: "pointer" }}
                  onClick={() => toggleSort("reliability")}
                >
                  <InfoLabel {...COLUMN_GLOSSARY.reliability} />
                  {sortArrow("reliability")}
                </th>
                <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => toggleSort("qt_a")}>
                  <InfoLabel {...COLUMN_GLOSSARY.qtA} />
                  {sortArrow("qt_a")}
                </th>
                <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => toggleSort("fvm")}>
                  <InfoLabel {...COLUMN_GLOSSARY.fvm} />
                  {sortArrow("fvm")}
                </th>
                <th
                  style={{ textAlign: "right", cursor: "pointer" }}
                  onClick={() => toggleSort("target")}
                >
                  Target{sortArrow("target")}
                </th>
                <th
                  style={{ textAlign: "right", cursor: "pointer" }}
                  onClick={() => toggleSort("fair_value")}
                >
                  Fair value{sortArrow("fair_value")}
                </th>
                <th
                  style={{ textAlign: "right", cursor: "pointer" }}
                  onClick={() => toggleSort("max_bid")}
                >
                  Max bid{sortArrow("max_bid")}
                </th>
                <th
                  style={{ textAlign: "right", cursor: "pointer" }}
                  onClick={() => toggleSort("panic_price")}
                >
                  Panic price{sortArrow("panic_price")}
                </th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <MergedValuationRow
                  key={r.player_id}
                  leagueId={league.id}
                  rec={r}
                  valuation={valuationByPlayer.get(r.player_id) ?? null}
                  factor={valuationScale}
                  leagueBudget={league.budget}
                  normalizedScore={normById.get(r.player_id)}
                  purchased={purchasedIds.has(r.player_id)}
                  isTrap={trapTagIds.has(r.player_id)}
                  onToggleTrap={() => toggleTrap(r.player_id)}
                  onDetails={() => setDetailPlayerId(r.player_id)}
                  onSaved={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailPlayer && (
        <ScoreBreakdownDialog
          player={detailPlayer}
          normalizedScore={normById.get(detailPlayer.player_id) ?? null}
          isTrap={trapTagIds.has(detailPlayer.player_id)}
          onToggleTrap={() => toggleTrap(detailPlayer.player_id)}
          onClose={() => setDetailPlayerId(null)}
        />
      )}
    </>
  );
}
