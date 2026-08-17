-- Up Migration

-- Lista di supporto per obiettivi d'asta: non fa parte dello stato derivato
-- (residuo/slot/max bid), è ortogonale al log `purchase`.
CREATE TABLE wishlist (
  league_id INTEGER NOT NULL REFERENCES league(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES player(id),
  priority INTEGER,
  note TEXT,
  PRIMARY KEY (league_id, player_id)
);

-- Down Migration

DROP TABLE IF EXISTS wishlist;
