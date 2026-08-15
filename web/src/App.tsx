import { useEffect, useState } from "react";

type ConnectionStatus = "checking" | "ok" | "error";

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

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
    </main>
  );
}

export default App;
