// Wrapper minimo su fetch: imposta sempre credentials "include" così ogni
// chiamata porta il cookie di sessione, senza doverlo ricordare per ogni
// nuovo file api/*.ts.
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}
