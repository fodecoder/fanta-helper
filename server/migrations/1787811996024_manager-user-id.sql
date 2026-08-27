-- Up Migration

ALTER TABLE manager ADD COLUMN user_id INTEGER REFERENCES app_user (id) ON DELETE SET NULL;

-- Down Migration

ALTER TABLE manager DROP COLUMN IF EXISTS user_id;
