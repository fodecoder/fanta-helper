import { useState } from "react";
import type { AvatarColor, AvatarEmoji, User } from "@fanta-helper/shared";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@fanta-helper/shared";
import * as authApi from "../../api/auth";
import { AuthApiError } from "../../api/auth";
import { UserAvatar } from "../UserAvatar";

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
}

export function ProfileModal({ user, onClose, onUserUpdated }: ProfileModalProps) {
  const [avatar, setAvatar] = useState<AvatarEmoji | null>(user.avatar as AvatarEmoji | null);
  const [color, setColor] = useState<AvatarColor | null>(user.avatar_color as AvatarColor | null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await authApi.updateProfile({ avatar, avatar_color: color });
      onUserUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.payload.error.message : "salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  const preview: User = { ...user, avatar, avatar_color: color };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Profilo</h2>
        <div className="dialog-body">
          <div className="profile-preview">
            <UserAvatar user={preview} />
            <span>{user.username}</span>
          </div>

          <p className="profile-label">Avatar</p>
          <div className="profile-grid">
            <button
              type="button"
              className={`profile-swatch${avatar === null ? " is-selected" : ""}`}
              onClick={() => setAvatar(null)}
              title="Iniziali"
            >
              Aa
            </button>
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`profile-swatch${avatar === emoji ? " is-selected" : ""}`}
                onClick={() => setAvatar(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <p className="profile-label">Colore</p>
          <div className="profile-grid">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`profile-swatch profile-swatch--color${color === c ? " is-selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          {error && (
            <p className="profile-label" style={{ color: "var(--color-danger, #e11d48)" }}>
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
