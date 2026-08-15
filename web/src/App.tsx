import { useEffect, useState } from "react";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayerImportPage } from "./pages/PlayerImportPage";

type ConnectionStatus = "checking" | "ok" | "error";
type View = "leagues" | "import";

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [view, setView] = useState<View>("leagues");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/health`, { signal: controller.signal })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Fanta Helper</h1>
      <p>Backend: {status}</p>
      <nav>
        <button type="button" onClick={() => setView("leagues")} disabled={view === "leagues"}>
          Leghe
        </button>
        <button type="button" onClick={() => setView("import")} disabled={view === "import"}>
          Import quotazioni
        </button>
      </nav>
      {view === "leagues" ? <LeaguesPage /> : <PlayerImportPage />}
    </main>
  );
}

export default App;
