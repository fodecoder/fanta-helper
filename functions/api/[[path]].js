// Cloudflare Pages Function: inoltra ogni /api/* al backend su Render mantenendo
// lo stesso origin lato browser. Così il cookie di sessione è first-party
// (SameSite=Lax basta) e i browser mobile non lo scartano come cookie di terze
// parti. `API_ORIGIN` è una env var del progetto Pages (es. https://<app>.onrender.com).
// Deve stare nella cartella `functions/` alla ROOT del progetto Pages
// (root directory = root del repo), non dentro `web/`.
export async function onRequest({ request, params, env }) {
  const origin = (env.API_ORIGIN || "").replace(/\/$/, "");
  if (!origin) {
    return new Response("API_ORIGIN is not configured", { status: 500 });
  }

  const rest = Array.isArray(params.path) ? params.path.join("/") : params.path ?? "";
  const src = new URL(request.url);
  const target = `${origin}/${rest}${src.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  return fetch(target, { method, headers, body, redirect: "manual" });
}
