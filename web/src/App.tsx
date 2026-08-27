import { useCallback, useEffect, useState } from "react";
import type { League, User } from "@fanta-helper/shared";
import * as leaguesApi from "./api/leagues";
import * as purchasesApi from "./api/purchases";
import * as authApi from "./api/auth";
import { Sidebar, type SetupPage } from "./components/shell/Sidebar";
import { BottomNav } from "./components/shell/BottomNav";
import { StatusMessage } from "./components/StatusMessage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ManagersPage } from "./pages/ManagersPage";
import { ValuationsPage } from "./pages/ValuationsPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { PlayerImportPage } from "./pages/PlayerImportPage";
import { GkPairingPage } from "./pages/GkPairingPage";
import { RosterExchangePage } from "./pages/RosterExchangePage";
import { ProbableLineupPage } from "./pages/ProbableLineupPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { AuctionMode } from "./pages/auction/AuctionMode";

type ConnectionStatus = "checking" | "ok" | "error";
type Mode = "setup" | "auction";
type AuthStatus = "checking" | "authenticated" | "anonymous";

function readLeagueIdFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get("league");
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

function writeLeagueIdToUrl(id: number | null) {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete("league");
  } else {
    url.searchParams.set("league", String(id));
  }
  window.history.replaceState(null, "", url);
}

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(readLeagueIdFromUrl);
  const [page, setPage] = useState<SetupPage>("panoramica");
  const [mode, setMode] = useState<Mode>("setup");
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
  const [shellRefresh, setShellRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL}/health`, { signal: controller.signal })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((user) => {
        setCurrentUser(user);
        setAuthStatus("authenticated");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAuthStatus("anonymous");
      });
    return () => controller.abort();
  }, []);

  const reloadLeagues = useCallback((signal?: AbortSignal) => {
    return leaguesApi
      .listLeagues(signal)
      .then((data) => {
        setLeagues(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "failed to load leagues");
      });
  }, []);

  useEffect(() => {
    // Un return anticipato nel render (gate di login) non ferma questo effetto:
    // gli hook restano legati all'istanza del componente, non al ramo JSX
    // restituito. Il guard va quindi qui, non solo nel render.
    if (authStatus !== "authenticated") return;
    const controller = new AbortController();
    void reloadLeagues(controller.signal);
    return () => controller.abort();
  }, [authStatus, reloadLeagues]);

  // Lega attiva risolta in render: la scelta esplicita (anche da URL) se valida,
  // altrimenti la prima disponibile. Nessuno stato normalizzato via effetto.
  const activeLeague =
    (activeLeagueId !== null ? leagues?.find((l) => l.id === activeLeagueId) : undefined) ??
    leagues?.[0] ??
    null;
  const activeLeagueResolvedId = activeLeague?.id ?? null;
  // Senza leghe si resta sempre su "Leghe" (unica pagina utilizzabile).
  const effectivePage: SetupPage = activeLeague === null ? "leghe" : page;

  // Contatore chiamate globale (numero di acquisti nella lega attiva) per la
  // testata di pagina; si aggiorna al cambio lega e all'uscita dall'asta.
  useEffect(() => {
    if (activeLeagueResolvedId === null) return;
    const controller = new AbortController();
    purchasesApi
      .listPurchases(activeLeagueResolvedId, controller.signal)
      .then((rows) => setPurchaseCount(rows.length))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPurchaseCount(null);
      });
    return () => controller.abort();
  }, [activeLeagueResolvedId, shellRefresh]);

  function handleSelectLeague(id: number | null) {
    setActiveLeagueId(id);
    writeLeagueIdToUrl(id);
    setPage(id === null ? "leghe" : "panoramica");
  }

  function handleExitAuction() {
    setMode("setup");
    setShellRefresh((t) => t + 1);
  }

  function handleLogout() {
    void authApi.logout().finally(() => {
      setCurrentUser(null);
      setAuthStatus("anonymous");
      setLeagues(null);
      setActiveLeagueId(null);
      writeLeagueIdToUrl(null);
    });
  }

  if (authStatus === "checking") {
    return <StatusMessage kind="loading">Verifica sessione…</StatusMessage>;
  }

  if (authStatus === "anonymous") {
    return (
      <LoginPage
        onLoggedIn={(user) => {
          setCurrentUser(user);
          setAuthStatus("authenticated");
        }}
      />
    );
  }

  if (mode === "auction" && activeLeague) {
    return <AuctionMode league={activeLeague} onExit={handleExitAuction} />;
  }

  return (
    <div className="shell">
      <Sidebar
        leagues={leagues ?? []}
        activeLeague={activeLeague}
        onSelectLeague={handleSelectLeague}
        page={effectivePage}
        onNavigate={setPage}
        onEnterAuction={() => setMode("auction")}
        backendStatus={status}
        version={__APP_VERSION__}
        currentUser={currentUser!}
        onLogout={handleLogout}
      />
      <main className="main">
        {loadError ? (
          <StatusMessage kind="error">{loadError}</StatusMessage>
        ) : leagues === null ? (
          <StatusMessage kind="loading">Caricamento…</StatusMessage>
        ) : effectivePage === "leghe" ? (
          <LeaguesPage
            calls={purchaseCount}
            activeLeagueId={activeLeagueResolvedId}
            onLeaguesChanged={() => void reloadLeagues()}
            onSelectLeague={handleSelectLeague}
          />
        ) : activeLeague === null ? (
          <StatusMessage kind="empty">Nessuna lega. Creane una dalla pagina Leghe.</StatusMessage>
        ) : effectivePage === "panoramica" ? (
          <OverviewPage league={activeLeague} calls={purchaseCount} />
        ) : effectivePage === "manager" ? (
          <ManagersPage league={activeLeague} calls={purchaseCount} />
        ) : effectivePage === "valutazioni" ? (
          <ValuationsPage league={activeLeague} calls={purchaseCount} />
        ) : effectivePage === "consigli" ? (
          <RecommendationsPage league={activeLeague} calls={purchaseCount} />
        ) : effectivePage === "quotazioni" ? (
          <PlayerImportPage calls={purchaseCount} />
        ) : effectivePage === "portieri" ? (
          <GkPairingPage calls={purchaseCount} />
        ) : effectivePage === "rose" ? (
          <RosterExchangePage league={activeLeague} calls={purchaseCount} />
        ) : (
          <ProbableLineupPage calls={purchaseCount} />
        )}
      </main>
      <BottomNav
        leagues={leagues ?? []}
        activeLeague={activeLeague}
        onSelectLeague={handleSelectLeague}
        page={effectivePage}
        onNavigate={setPage}
        onEnterAuction={() => setMode("auction")}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
