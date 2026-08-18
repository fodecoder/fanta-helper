-- Up Migration

-- Matrice coppie portieri: dato di riferimento globale, sostituisce la
-- gerarchia titolare/riserva (goalkeeper_grid). Una riga per coppia non
-- ordinata (team_b > team_a forza l'ordine), punteggio più basso = coppia
-- più favorevole (calendari-casa più complementari); le coppie che
-- condividono lo stadio valgono 0.
CREATE TABLE gk_pairing (
  id SERIAL PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL CHECK (team_b > team_a),
  score INTEGER NOT NULL CHECK (score >= 0),
  CONSTRAINT gk_pairing_team_pair_uk UNIQUE (team_a, team_b)
);

CREATE INDEX idx_gk_pairing_team_a ON gk_pairing (team_a);
CREATE INDEX idx_gk_pairing_team_b ON gk_pairing (team_b);

DROP INDEX IF EXISTS idx_goalkeeper_grid_team;
DROP TABLE IF EXISTS goalkeeper_grid;

-- Down Migration

DROP INDEX IF EXISTS idx_gk_pairing_team_b;
DROP INDEX IF EXISTS idx_gk_pairing_team_a;
DROP TABLE IF EXISTS gk_pairing;

CREATE TABLE goalkeeper_grid (
  id SERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  name TEXT NOT NULL,
  CONSTRAINT goalkeeper_grid_team_rank_uk UNIQUE (team, rank)
);

CREATE INDEX idx_goalkeeper_grid_team ON goalkeeper_grid (team);
