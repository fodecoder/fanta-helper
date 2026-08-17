import { useState } from "react";
import type { League, Manager } from "@fanta-helper/shared";
import { ManagerList } from "../components/ManagerList";
import { ManagerForm } from "../components/ManagerForm";
import { PageHeader } from "../components/PageHeader";

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; manager: Manager };

interface ManagersPageProps {
  league: League;
  onBack: () => void;
}

export function ManagersPage({ league, onBack }: ManagersPageProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="page">
      <PageHeader title={`Manager — ${league.name}`} onBack={onBack} />

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
    </div>
  );
}
