import { config as loadEnv } from "dotenv";
import { hashPassword } from "../auth/password";
import { upsertUser } from "./users";
import { pool } from "./client";

// Password in chiaro solo da file locale non versionato (coperto dal
// pattern .env.* in .gitignore) — mai committate.
loadEnv({ path: ".env.seed-users" });

const USERS = [
  { username: "Andre", envVar: "SEED_PASSWORD_ANDRE", role: "member" },
  { username: "Davide", envVar: "SEED_PASSWORD_DAVIDE", role: "member" },
  { username: "Fra", envVar: "SEED_PASSWORD_FRA", role: "member" },
  { username: "Paul", envVar: "SEED_PASSWORD_PAUL", role: "member" },
  // Accesso di sola consultazione (es. per il team SoFIFA). Password condivisa,
  // deliberatamente banale: l'account non può modificare nulla.
  { username: "guest", envVar: "SEED_PASSWORD_GUEST", role: "guest" },
] as const;

async function seedUsers(): Promise<void> {
  for (const { username, envVar, role } of USERS) {
    const plain = process.env[envVar];
    if (!plain) {
      throw new Error(`missing ${envVar} in server/.env.seed-users`);
    }
    const password_hash = await hashPassword(plain);
    await upsertUser({ username, password_hash, avatar: null, avatar_color: null, role });
    console.log(`seeded user "${username}" (${role})`);
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
