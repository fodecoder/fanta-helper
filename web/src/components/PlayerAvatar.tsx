import type { Role } from "@fanta-helper/shared";

interface PlayerAvatarProps {
  name: string;
  team: string;
  ruolo: Role;
  image_url?: string | null;
  size?: "sm" | "md";
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  const word = words[0] ?? "";
  return word.slice(0, 2).toUpperCase();
}

// Deterministic hash of the team name into a stable hue — stands in for a
// real crest in MVP without fetching any external asset.
function teamAccentColor(team: string): string {
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = (hash * 31 + team.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function PlayerAvatar({ name, team, ruolo, image_url, size = "md" }: PlayerAvatarProps) {
  const sizeClass = size === "sm" ? "player-avatar--sm" : "player-avatar--md";

  if (image_url) {
    return (
      <img
        className={`player-avatar ${sizeClass}`}
        src={image_url}
        alt={name}
        width={size === "sm" ? 28 : 40}
        height={size === "sm" ? 28 : 40}
      />
    );
  }

  return (
    <div
      className={`player-avatar player-avatar--placeholder player-avatar--role-${ruolo} ${sizeClass}`}
      style={{ borderColor: teamAccentColor(team) }}
      title={`${name} (${team})`}
    >
      {getInitials(name)}
    </div>
  );
}
