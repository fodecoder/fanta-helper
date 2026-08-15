import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// `sslmode` in DATABASE_URL (e.g. Neon's `?sslmode=require`) is parsed by `pg`
// itself; no explicit `ssl` option needed, and none is passed so local
// Postgres instances without SSL keep working unmodified.
export const pool = new Pool({ connectionString });
