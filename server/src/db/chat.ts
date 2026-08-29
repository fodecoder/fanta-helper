import { pool } from "./client";
import type { ChatMessageRow } from "./types";

export async function insertMessage(
  fromUser: number,
  toUser: number,
  body: string,
): Promise<ChatMessageRow> {
  const result = await pool.query<ChatMessageRow>(
    `INSERT INTO chat_message (from_user, to_user, body)
     VALUES ($1, $2, $3) RETURNING *`,
    [fromUser, toUser, body],
  );
  return result.rows[0]!;
}

// Messaggi ricevuti da `userId` dopo `sinceIso`, da qualunque mittente.
// Proiezione di lettura del log: nessun concetto di "letto" sul server.
export async function listInboxSince(userId: number, sinceIso: string): Promise<ChatMessageRow[]> {
  const result = await pool.query<ChatMessageRow>(
    `SELECT * FROM chat_message
     WHERE to_user = $1 AND created_at > $2::timestamptz
     ORDER BY created_at, id
     LIMIT 200`,
    [userId, sinceIso],
  );
  return result.rows;
}

export async function listConversation(
  userA: number,
  userB: number,
  sinceIso?: string,
): Promise<ChatMessageRow[]> {
  const result = await pool.query<ChatMessageRow>(
    `SELECT * FROM chat_message
     WHERE ((from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1))
       AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)
     ORDER BY created_at, id
     LIMIT 500`,
    [userA, userB, sinceIso ?? null],
  );
  return result.rows;
}
