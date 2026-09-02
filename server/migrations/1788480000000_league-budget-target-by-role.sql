-- Up Migration
ALTER TABLE league ADD COLUMN budget_target_by_role JSONB NOT NULL
  DEFAULT '{"P":8,"D":16,"C":28,"A":48}'::jsonb;

-- Down Migration
ALTER TABLE league DROP COLUMN IF EXISTS budget_target_by_role;
