import { useEffect, useState } from "react";
import type { League } from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";
import { LeagueSelector } from "../components/LeagueSelector";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { ManagersPage } from "./ManagersPage";
import { ValuationsPage } from "./ValuationsPage";
import { AuctionPage } from "./AuctionPage";

type SubView = "managers" | "valuations" | "auction" | null;

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

export function HomePage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(readLeagueIdFromUrl);
  const [subView, setSubView] = useState<SubView>(null);

  useEffect(() => {
    const controller = new AbortController();
    leaguesApi
      .listLeagues(controller.signal)
      .then((data) => {
        setLeagues(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "failed to load leagues");
      });
    return () => controller.abort();
  }, []);

  const activeLeague = leagues?.find((league) => league.id === activeLeagueId) ?? null;

  function handleSelect(id: number | null) {
    setActiveLeagueId(id);
    setSubView(null);
    writeLeagueIdToUrl(id);
  }

  return (
    <div className="page">
      <PageHeader title="Home" />

      <div className="card">
        {loadError ? (
          <StatusMessage kind="error">{loadError}</StatusMessage>
        ) : leagues === null ? (
          <StatusMessage kind="loading">Caricamento…</StatusMessage>
        ) : (
          <LeagueSelector leagues={leagues} value={activeLeagueId} onChange={handleSelect} />
        )}
      </div>

      {!activeLeague ? (
        <StatusMessage kind="empty">Seleziona una lega per iniziare.</StatusMessage>
      ) : subView === null ? (
        <nav className="nav">
          <button type="button" className="nav-button" onClick={() => setSubView("managers")}>
            Manager
          </button>
          <button type="button" className="nav-button" onClick={() => setSubView("valuations")}>
            Valutazioni
          </button>
          <button type="button" className="nav-button" onClick={() => setSubView("auction")}>
            Asta
          </button>
        </nav>
      ) : subView === "managers" ? (
        <ManagersPage league={activeLeague} onBack={() => setSubView(null)} />
      ) : subView === "valuations" ? (
        <ValuationsPage league={activeLeague} onBack={() => setSubView(null)} />
      ) : (
        <AuctionPage league={activeLeague} onBack={() => setSubView(null)} />
      )}
    </div>
  );
}
