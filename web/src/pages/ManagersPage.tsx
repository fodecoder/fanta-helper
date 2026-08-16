import { useState } from "react";
import type { League, Manager } from "@fanta-helper/shared";
import { ManagerList } from "../components/ManagerList";
import { ManagerForm } from "../components/ManagerForm";

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; manager: Manager };

interface ManagersPageProps {
  league: League;
  onBack: () => void;
}

export function ManagersPage({ league, onBack }: ManagersPageProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <section>
      <button type="button" onClick={onBack}>
        Torna alle leghe
      </button>
      <h1>Manager — {league.name}</h1>

      {view.mode === "list" ? (
        <ManagerList
          leagueId={league.id}
          refreshToken={refreshToken}
          onCreate={() => setView({ mode: "create" })}
          onEdit={(manager) => setView({ mode: "edit", manager })}
          onDeleted={() => setRefreshToken((t) => t + 1)}
        />
      ) : (
        <ManagerForm
          leagueId={league.id}
          initial={view.mode === "edit" ? view.manager : undefined}
          onSaved={() => {
            setView({ mode: "list" });
            setRefreshToken((t) => t + 1);
          }}
          onCancel={() => setView({ mode: "list" })}
        />
      )}
    </section>
  );
}
