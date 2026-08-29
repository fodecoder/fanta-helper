interface UserAvatarUser {
  username: string;
  avatar: string | null;
  avatar_color: string | null;
}

interface UserAvatarProps {
  user: UserAvatarUser;
  size?: "sm" | "md";
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

// Tinta di fallback deterministica dallo username, così un utente senza
// colore scelto ha comunque un avatar stabile invece di un grigio piatto.
function fallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const sizeClass = size === "sm" ? "user-avatar--sm" : "user-avatar--md";
  const background = user.avatar_color ?? fallbackColor(user.username);
  return (
    <span
      className={`user-avatar ${sizeClass}`}
      style={{ background }}
      title={user.username}
      aria-hidden="true"
    >
      {user.avatar ?? getInitials(user.username)}
    </span>
  );
}
