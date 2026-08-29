import { createHmac } from "node:crypto";
import { SESSION_COOKIE } from "../auth/session";

// Stessa firma di `cookie-signature` (usata da cookie-parser): valore + "." +
// HMAC-SHA256 in base64 senza padding. Evita un login reale nei test di route.
function sign(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("base64").replace(/=+$/, "");
  return `${value}.${mac}`;
}

export function sessionCookie(userId: number): string {
  const secret = process.env.COOKIE_SECRET ?? "test-cookie-secret";
  return `${SESSION_COOKIE}=${encodeURIComponent(`s:${sign(String(userId), secret)}`)}`;
}
