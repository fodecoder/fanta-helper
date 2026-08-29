// Variabili richieste all'import: `createApp` pretende COOKIE_SECRET e
// `db/client.ts` istanzia un Pool da DATABASE_URL (senza connettere).
process.env.COOKIE_SECRET ??= "test-cookie-secret";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
