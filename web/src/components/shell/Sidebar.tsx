import type { League } from "@fanta-helper/shared";

export type SetupPage =
  "panoramica" | "manager" | "valutazioni" | "quotazioni" | "portieri" | "formazioni" | "leghe";

export const NAV_ITEMS: { key: SetupPage; label: string }[] = [
  { key: "panoramica", label: "Panoramica" },
  { key: "manager", label: "Manager" },
  { key: "valutazioni", label: "Valutazioni" },
  { key: "quotazioni", label: "Quotazioni · import" },
  { key: "portieri", label: "Coppie portieri" },
  { key: "formazioni", label: "Probabili formazioni" },
  { key: "leghe", label: "Leghe" },
];

interface SidebarProps {
  leagues: League[];
  activeLeague: League | null;
  onSelectLeague: (id: number | null) => void;
  page: SetupPage;
  onNavigate: (page: SetupPage) => void;
  onEnterAuction: () => void;
  backendStatus: string;
  version: string;
}

export function Sidebar({
  leagues,
  activeLeague,
  onSelectLeague,
  page,
  onNavigate,
  onEnterAuction,
  backendStatus,
  version,
}: SidebarProps) {
  const roster = activeLeague?.roster_config;
  const meta = activeLeague
    ? `${activeLeague.n_squadre} squadre · budget ${activeLeague.budget} · rosa ${roster!.P}·${roster!.D}·${roster!.C}·${roster!.A}`
    : "nessuna lega selezionata";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="" />
        <span>FantaProfeta</span>
      </div>

      <div className="sidebar-league">
        <span className="sidebar-kicker">Lega attiva</span>
        <select
          aria-label="Lega attiva"
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
        <span className="sidebar-meta">{meta}</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={page === item.key ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 0 }}
          onClick={onEnterAuction}
          disabled={activeLeague === null}
        >
          Entra in modalità asta
        </button>
        <span className="note">Schermo pieno, tastiera, nessuna navigazione. Esci con Esc.</span>
        <span className="version">
          v{version} · backend {backendStatus}
        </span>
      </div>
    </aside>
  );
}
