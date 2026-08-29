import { useState } from "react";
import type { User } from "@fanta-helper/shared";
import { UserAvatar } from "../UserAvatar";
import { ProfileModal } from "./ProfileModal";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

export function UserMenu({ user, onLogout, onUserUpdated }: UserMenuProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu-identity"
        onClick={() => setEditing(true)}
        title="Modifica profilo"
      >
        <UserAvatar user={user} size="sm" />
        <span>{user.username}</span>
      </button>
      <button type="button" className="btn btn-ghost" onClick={onLogout}>
        Esci
      </button>
      {editing && (
        <ProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onUserUpdated={onUserUpdated}
        />
      )}
    </div>
  );
}
