import { config as loadEnv } from "dotenv";
import { hashPassword } from "../auth/password";
import { upsertUser } from "./users";
import { pool } from "./client";

// Password in chiaro solo da file locale non versionato (coperto dal
// pattern .env.* in .gitignore) — mai committate.
loadEnv({ path: ".env.seed-users" });

const USERS = [
  { username: "Andre", envVar: "SEED_PASSWORD_ANDRE" },
  { username: "Davide", envVar: "SEED_PASSWORD_DAVIDE" },
  { username: "Fra", envVar: "SEED_PASSWORD_FRA" },
  { username: "Paul", envVar: "SEED_PASSWORD_PAUL" },
] as const;

async function seedUsers(): Promise<void> {
  for (const { username, envVar } of USERS) {
    const plain = process.env[envVar];
    if (!plain) {
      throw new Error(`missing ${envVar} in server/.env.seed-users`);
    }
    const password_hash = await hashPassword(plain);
    await upsertUser({ username, password_hash, avatar: null, avatar_color: null });
    console.log(`seeded user "${username}"`);
  }
}

seedUsers()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
