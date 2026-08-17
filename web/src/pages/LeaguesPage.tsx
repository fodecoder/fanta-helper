import { useState } from "react";
import type { League } from "@fanta-helper/shared";
import { LeagueList } from "../components/LeagueList";
import { LeagueForm } from "../components/LeagueForm";
import { ManagersPage } from "./ManagersPage";
import { ValuationsPage } from "./ValuationsPage";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; league: League }
  | { mode: "managers"; league: League }
  | { mode: "valuations"; league: League };

export function LeaguesPage() {
  const [view, setView] = useState<View>({ mode: "list" });
  const [refreshToken, setRefreshToken] = useState(0);

  if (view.mode === "list") {
    return (
      <LeagueList
        refreshToken={refreshToken}
        onCreate={() => setView({ mode: "create" })}
        onEdit={(league) => setView({ mode: "edit", league })}
        onManageManagers={(league) => setView({ mode: "managers", league })}
        onManageValuations={(league) => setView({ mode: "valuations", league })}
        onDeleted={() => setRefreshToken((t) => t + 1)}
      />
    );
  }

  if (view.mode === "managers") {
    return <ManagersPage league={view.league} onBack={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "valuations") {
    return <ValuationsPage league={view.league} onBack={() => setView({ mode: "list" })} />;
  }

  return (
    <LeagueForm
      initial={view.mode === "edit" ? view.league : undefined}
      onSaved={() => {
        setView({ mode: "list" });
        setRefreshToken((t) => t + 1);
      }}
      onCancel={() => setView({ mode: "list" })}
    />
  );
}
