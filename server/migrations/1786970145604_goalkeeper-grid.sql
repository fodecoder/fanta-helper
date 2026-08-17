-- Up Migration

-- Griglia portieri: dato di riferimento globale (gerarchia dei portieri per
-- squadra), non legato a league/purchase. `rank` 1 = titolare.
CREATE TABLE goalkeeper_grid (
  id SERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  name TEXT NOT NULL,
  CONSTRAINT goalkeeper_grid_team_rank_uk UNIQUE (team, rank)
);

CREATE INDEX idx_goalkeeper_grid_team ON goalkeeper_grid (team);

-- Down Migration

DROP INDEX IF EXISTS idx_goalkeeper_grid_team;
DROP TABLE IF EXISTS goalkeeper_grid;
