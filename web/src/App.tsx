import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayerImportPage } from "./pages/PlayerImportPage";
import { GkPairingPage } from "./pages/GkPairingPage";
import { ProbableLineupPage } from "./pages/ProbableLineupPage";

type ConnectionStatus = "checking" | "ok" | "error";
type View = "home" | "leagues" | "import" | "gkPairing" | "probableLineups";

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/health`, { signal: controller.signal })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));

    return () => controller.abort();
  }, []);

  return (
    <main>
      <header className="app-header">
        <h1 className="app-title">
          <img src="/logo.png" alt="" className="app-logo" />
          FantaProfeta
        </h1>
        <p className="status">Backend: {status}</p>
        <nav className="nav">
          <button
            type="button"
            className="nav-button"
            onClick={() => setView("home")}
            disabled={view === "home"}
          >
            Home
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => setView("leagues")}
            disabled={view === "leagues"}
          >
            Leghe
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => setView("import")}
            disabled={view === "import"}
          >
            Import quotazioni
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => setView("gkPairing")}
            disabled={view === "gkPairing"}
          >
            Coppie portieri
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => setView("probableLineups")}
            disabled={view === "probableLineups"}
          >
            Probabili formazioni
          </button>
        </nav>
      </header>
      {view === "home" ? (
        <HomePage />
      ) : view === "leagues" ? (
        <LeaguesPage />
      ) : view === "import" ? (
        <PlayerImportPage />
      ) : view === "gkPairing" ? (
        <GkPairingPage />
      ) : (
        <ProbableLineupPage />
      )}
      <footer className="app-footer">
        <span>FantaProfeta v{__APP_VERSION__}</span>
      </footer>
    </main>
  );
}

export default App;
