import "dotenv/config";
import { Pool, types } from "pg";
import type { PoolClient } from "pg";

// node-postgres restituisce le colonne NUMERIC come stringa (OID 1700) per
// non perdere precisione sui BIGNUMERIC — ma qui i valori (es. `mv`/`fm` di
// player_season_stats) sono voti/fantamedie su cui il motore di consiglio fa
// aritmetica: senza questo parser un'addizione diventa una concatenazione di
// stringhe. Nessuna colonna DECIMAL/NUMERIC della lega richiede precisione
// arbitraria, quindi il parsing a float è sicuro per l'intera app.
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// `sslmode` in DATABASE_URL (e.g. Neon's `?sslmode=require`) is parsed by `pg`
// itself; no explicit `ssl` option needed, and none is passed so local
// Postgres instances without SSL keep working unmodified.
export const pool = new Pool({ connectionString });

// Lets data-access functions accept either the shared pool or an open
// transaction client, so callers composing multiple writes into one
// transaction can thread their client through instead of each function
// opening its own.
export type Queryable = Pool | PoolClient;
