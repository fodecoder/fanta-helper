import type { User } from "@fanta-helper/shared";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <div className="user-menu">
      <span>{user.username}</span>
      <button type="button" className="btn btn-ghost" onClick={onLogout}>
        Esci
      </button>
    </div>
  );
}
