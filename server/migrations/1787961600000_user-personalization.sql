-- Up Migration

-- Layer di personalizzazione per-utente. Entrambe le tabelle sono sparse e
-- additive: non sostituiscono mai il dato di base condiviso (`valuation`,
-- score del motore consigli), lo affiancano solo per l'utente che le scrive.

CREATE TABLE user_valuation_override (
  user_id     INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  league_id   INTEGER NOT NULL REFERENCES league(id)   ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES player(id)   ON DELETE CASCADE,
  target      INTEGER,
  fair_value  INTEGER,
  max_bid     INTEGER,
  panic_price INTEGER,
  note        TEXT,
  PRIMARY KEY (user_id, league_id, player_id),
  CONSTRAINT user_valuation_override_nonneg CHECK (
    (target      IS NULL OR target      >= 0) AND
    (fair_value  IS NULL OR fair_value  >= 0) AND
    (max_bid     IS NULL OR max_bid     >= 0) AND
    (panic_price IS NULL OR panic_price >= 0)
  )
);

CREATE TABLE user_team_pref (
  user_id   INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES league(id)   ON DELETE CASCADE,
  team      TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('prefer', 'avoid')),
  PRIMARY KEY (user_id, league_id, team)
);

-- Down Migration

DROP TABLE IF EXISTS user_team_pref;
DROP TABLE IF EXISTS user_valuation_override;
