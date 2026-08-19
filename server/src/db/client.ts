import "dotenv/config";
import { Pool } from "pg";
import type { PoolClient } from "pg";

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
