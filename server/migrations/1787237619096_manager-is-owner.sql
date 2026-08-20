-- Up Migration

ALTER TABLE manager ADD COLUMN is_owner BOOLEAN NOT NULL DEFAULT false;

-- Un solo proprietario per lega, garantito dal DB.
CREATE UNIQUE INDEX manager_one_owner_per_league_uk ON manager (league_id) WHERE is_owner;

-- Backfill: preferisci il manager chiamato 'Io'; se assente (già rinominato),
-- il primo creato (min id) della lega.
WITH owner_pick AS (
  SELECT DISTINCT ON (league_id) id
  FROM manager
  ORDER BY league_id, (name = 'Io') DESC, id ASC
)
UPDATE manager
SET is_owner = true
FROM owner_pick
WHERE manager.id = owner_pick.id;

-- Down Migration

DROP INDEX IF EXISTS manager_one_owner_per_league_uk;
ALTER TABLE manager DROP COLUMN IF EXISTS is_owner;
