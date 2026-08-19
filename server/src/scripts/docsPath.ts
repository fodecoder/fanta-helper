import { fileURLToPath } from "node:url";
import path from "node:path";

// Risolve <repo-root>/docs a partire dalla posizione di questo file (non da
// process.cwd()), così gli script di seed funzionano indipendentemente dalla
// directory da cui viene invocato `tsx`.
export function resolveDocsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..", "docs");
}
