import type { Response, CookieOptions } from "express";

export const SESSION_COOKIE = "session";

// httpOnly sempre (mai leggibile da JS client). Web (Cloudflare Pages) e
// server (Render) sono origini diverse sia in prod sia in dev
// (localhost:5173 vs :8787, cross-site anche in locale ai fini di
// SameSite): SameSite=Lax romperebbe le fetch cross-port in dev, quindi
// serve SameSite=None, che a sua volta richiede Secure — concesso dai
// browser anche su http://localhost (origine "trustworthy" per eccezione)
// ma non su un IP LAN non-localhost, da cui l'escape hatch COOKIE_SECURE.
function cookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE !== "false";
  return {
    httpOnly: true,
    signed: true,
    secure,
    sameSite: secure ? "none" : "lax",
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
