import type { League } from "@fanta-helper/shared";

interface LeagueSelectorProps {
  leagues: League[];
  value: number | null;
  onChange: (id: number | null) => void;
}

export function LeagueSelector({ leagues, value, onChange }: LeagueSelectorProps) {
  return (
    <label>
      Lega attiva
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">— seleziona lega —</option>
        {leagues.map((league) => (
          <option key={league.id} value={league.id}>
            {league.name}
          </option>
        ))}
      </select>
    </label>
  );
}
