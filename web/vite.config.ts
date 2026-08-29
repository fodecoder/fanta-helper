import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootPackage = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  server: {
    port: 5173,
    // Le chiamate API passano da `/api` sullo stesso origin della SPA: in dev
    // le inoltra qui il proxy, in prod una Cloudflare Pages Function
    // (`functions/api/[[path]].js`). Così il cookie di sessione è first-party e
    // basta `SameSite=Lax` — i browser mobile non lo scartano come farebbero con
    // un cookie di terze parti su domini separati (Pages vs Render).
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
