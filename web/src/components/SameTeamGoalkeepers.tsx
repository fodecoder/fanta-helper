import type { Player } from "@fanta-helper/shared";

interface SameTeamGoalkeeper {
  player: Player;
  tier: string | null;
  fairValue: number | null;
}

interface SameTeamGoalkeepersProps {
  goalkeepers: SameTeamGoalkeeper[];
}

// Blocco distinto dal suggerimento di accoppiata portieri (`GkPairingHint`):
// qui elenchiamo gli altri portieri della STESSA squadra del giocatore in
// chiamata, ordinati per fair value decrescente.
export function SameTeamGoalkeepers({ goalkeepers }: SameTeamGoalkeepersProps) {
  const [first] = goalkeepers;
  if (!first) return null;

  return (
    <div role="note" data-testid="same-team-gk" style={{ margin: "10px 0 0" }}>
      <h6 style={{ margin: "0 0 6px", color: "var(--color-neutral-700)" }}>
        Altri portieri di {first.player.team}
      </h6>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {goalkeepers.map(({ player, tier, fairValue }) => (
          <li
            key={player.id}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
          >
            <span className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
              {player.nome_completo ?? player.name}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{player.team}</span>
            {tier && <span className="tag tag-neutral">{tier}</span>}
            <span className="num" style={{ fontWeight: 600 }}>
              {fairValue ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
