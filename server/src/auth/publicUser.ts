import type { User } from "@fanta-helper/shared";
import type { AppUserRow } from "../db/types";

export function toPublicUser(row: AppUserRow): User {
  return { id: row.id, username: row.username, avatar: row.avatar, avatar_color: row.avatar_color };
}
