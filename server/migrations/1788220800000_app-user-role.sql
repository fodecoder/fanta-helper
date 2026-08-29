-- Up Migration

-- Ruolo dell'utente: `member` (i partecipanti della lega, pieno accesso) oppure
-- `guest` (sola consultazione del portale — usato per dare un accesso di
-- navigazione a terzi, es. il team SoFIFA). L'enforcement è lato API: ogni
-- metodo non-safe è 403 per i guest.
ALTER TABLE app_user ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'guest'));

-- Down Migration

ALTER TABLE app_user DROP COLUMN IF EXISTS role;
