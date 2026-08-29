import type { Response, CookieOptions } from "express";

export const SESSION_COOKIE = "session";

// httpOnly sempre (mai leggibile da JS client). Il browser parla solo con
// l'origin della SPA: in dev via proxy Vite, in prod via Pages Function, le
// chiamate API sono `/api/*` same-origin, quindi il cookie è first-party e
// `SameSite=Lax` basta. Il salto cross-site verso Render avviene server-to-server
// (proxy → backend), dove SameSite non si applica. `Secure` resta di default;
// l'escape hatch COOKIE_SECURE=false serve solo per test su IP LAN non-localhost.
function cookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE !== "false";
  return {
    httpOnly: true,
    signed: true,
    secure,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: "/",
  };
}

export function setSessionCookie(res: Response, userId: number): void {
  res.cookie(SESSION_COOKIE, String(userId), cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, path: "/" });
}
