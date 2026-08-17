import { useState } from "react";
import type { League } from "@fanta-helper/shared";
import { LeagueList } from "../components/LeagueList";
import { LeagueForm } from "../components/LeagueForm";

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; league: League };

export function LeaguesPage() {
  const [view, setView] = useState<View>({ mode: "list" });
  const [refreshToken, setRefreshToken] = useState(0);

  if (view.mode === "list") {
    return (
      <LeagueList
        refreshToken={refreshToken}
        onCreate={() => setView({ mode: "create" })}
        onEdit={(league) => setView({ mode: "edit", league })}
        onDeleted={() => setRefreshToken((t) => t + 1)}
      />
    );
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
