// Cloudflare Pages Function: inoltra ogni /api/* al backend su Render mantenendo
// lo stesso origin lato browser. Così il cookie di sessione è first-party
// (SameSite=Lax basta) e i browser mobile non lo scartano come cookie di terze
// parti. `API_ORIGIN` è una env var del progetto Pages (es. https://<app>.onrender.com).
export async function onRequest({ request, params, env }) {
  const origin = (env.API_ORIGIN || "").replace(/\/$/, "");
  if (!origin) {
    return new Response("API_ORIGIN is not configured", { status: 500 });
  }

  const rest = Array.isArray(params.path) ? params.path.join("/") : params.path ?? "";
  const url = new URL(request.url);
  const target = `${origin}/${rest}${url.search}`;

  // `new Request(target, request)` copia metodo, header (Cookie incluso) e body.
  // La risposta del backend (con i suoi Set-Cookie) torna al browser invariata.
  return fetch(new Request(target, request));
}
