-- Up Migration

-- Probabili formazioni: riferimento globale (indipendente da league/purchase),
-- come goalkeeper_grid. Una riga per giocatore citato in una probabile
-- formazione editoriale. `ruolo` è nullable perché non sempre leggibile dallo
-- screenshot. L'unicità su (team, player_name) riflette il fatto che
-- l'ingest è per-squadra e ogni giocatore compare una sola volta nella
-- probabile formazione di una squadra in un dato momento; protegge anche il
-- replace transazionale da un doppio insert dello stesso giocatore nella
-- stessa conferma.
CREATE TABLE probable_lineup (
  id SERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  player_name TEXT NOT NULL,
  ruolo TEXT,
  stato TEXT NOT NULL CHECK (stato IN ('titolare', 'panchina', 'ballottaggio')),
  CONSTRAINT probable_lineup_team_player_uk UNIQUE (team, player_name)
);

-- Screenshot conservato per squadra: una riga per squadra, sovrascritta a
-- ogni nuovo upload.
CREATE TABLE probable_lineup_screenshot (
  team TEXT PRIMARY KEY,
  image BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE IF EXISTS probable_lineup_screenshot;
DROP TABLE IF EXISTS probable_lineup;
