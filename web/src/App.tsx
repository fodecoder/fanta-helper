import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayerImportPage } from "./pages/PlayerImportPage";
import { GoalkeeperGridPage } from "./pages/GoalkeeperGridPage";

type ConnectionStatus = "checking" | "ok" | "error";
type View = "home" | "leagues" | "import" | "goalkeepers";

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
        <h1>Fanta Helper</h1>
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
            onClick={() => setView("goalkeepers")}
            disabled={view === "goalkeepers"}
          >
            Griglia portieri
          </button>
        </nav>
      </header>
      {view === "home" ? (
        <HomePage />
      ) : view === "leagues" ? (
        <LeaguesPage />
      ) : view === "import" ? (
        <PlayerImportPage />
      ) : (
        <GoalkeeperGridPage />
      )}
    </main>
  );
}

export default App;
