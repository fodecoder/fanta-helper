-- Up Migration

CREATE TABLE league (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  n_squadre INTEGER NOT NULL,
  budget INTEGER NOT NULL,
  roster_config JSONB NOT NULL,
  scoring JSONB NOT NULL,
  modificatori JSONB NOT NULL
);

CREATE TABLE player (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('P', 'D', 'C', 'A')),
  image_url TEXT
);

CREATE TABLE valuation (
  league_id INTEGER NOT NULL REFERENCES league(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES player(id),
  tier TEXT NOT NULL,
  target INTEGER NOT NULL,
  fair_value INTEGER NOT NULL,
  max_bid INTEGER NOT NULL,
  panic_price INTEGER NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  note TEXT,
  PRIMARY KEY (league_id, player_id)
);

CREATE TABLE manager (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES league(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  CONSTRAINT manager_league_name_uk UNIQUE (league_id, name),
  CONSTRAINT manager_id_league_uk UNIQUE (id, league_id)
);

CREATE TABLE purchase (
  league_id INTEGER NOT NULL REFERENCES league(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES player(id),
  manager_id INTEGER NOT NULL,
  prezzo INTEGER NOT NULL CHECK (prezzo >= 0),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, player_id),
  CONSTRAINT purchase_manager_league_fk FOREIGN KEY (manager_id, league_id)
    REFERENCES manager(id, league_id) ON DELETE CASCADE
);

CREATE INDEX idx_purchase_league_manager ON purchase (league_id, manager_id);

-- Down Migration

DROP INDEX IF EXISTS idx_purchase_league_manager;
DROP TABLE IF EXISTS purchase;
DROP TABLE IF EXISTS manager;
DROP TABLE IF EXISTS valuation;
DROP TABLE IF EXISTS player;
DROP TABLE IF EXISTS league;
