import type { League } from "@fanta-helper/shared";
import { NAV_ITEMS, type SetupPage } from "./Sidebar";

interface BottomNavProps {
  leagues: League[];
  activeLeague: League | null;
  onSelectLeague: (id: number | null) => void;
  page: SetupPage;
  onNavigate: (page: SetupPage) => void;
  onEnterAuction: () => void;
}

export function BottomNav({
  leagues,
  activeLeague,
  onSelectLeague,
  page,
  onNavigate,
  onEnterAuction,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navigazione">
      <div className="bottom-nav-utility">
        <select
          aria-label="Lega attiva"
          className="bottom-nav-league"
          value={activeLeague?.id ?? ""}
          onChange={(e) => onSelectLeague(e.target.value === "" ? null : Number(e.target.value))}
        >
          {activeLeague === null && <option value="">— seleziona lega —</option>}
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary bottom-nav-cta"
          onClick={onEnterAuction}
          disabled={activeLeague === null}
        >
          Entra in asta
        </button>
      </div>
      <div className="bottom-nav-tabs">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="bottom-nav-tab"
            aria-current={page === item.key ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
