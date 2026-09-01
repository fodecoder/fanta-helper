import type { Role } from "@fanta-helper/shared";

interface PlayerAvatarProps {
  name: string;
  team: string;
  ruolo: Role;
  image_url?: string | null;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  const word = words[0] ?? "";
  return word.slice(0, 2).toUpperCase();
}

// Slot foto del giocatore (design handoff auction redesign § "Player photo
// slots"): quando `image_url` è presente entra come background-image sopra un
// fondo tinta-ruolo; quando manca resta il box tinta-ruolo con le iniziali.
// Niente <img>/onError: una foto assente non deve mai mostrare l'icona di
// immagine rotta.
export function PlayerAvatar({ name, team, ruolo, image_url, size = "md" }: PlayerAvatarProps) {
  const sizeClass = `photo-box--${size}`;

  if (image_url) {
    return (
      <span
        className={`photo-box ${sizeClass} photo-box--role-${ruolo}`}
        style={{ backgroundImage: `url("${image_url}")` }}
        title={`${name} (${team})`}
        role="img"
        aria-label={name}
      />
    );
  }

  return (
    <span
      className={`player-avatar player-avatar--placeholder player-avatar--role-${ruolo} player-avatar--${size}`}
      title={`${name} (${team})`}
    >
      {getInitials(name)}
    </span>
  );
}
