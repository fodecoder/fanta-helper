-- Up Migration

-- Rigoristi/tiratori di punizioni/corner: riferimento globale (come
-- probable_lineup), dato editoriale per squadra. `rank` = gerarchia (1 =
-- primo tiratore). L'unicità su (team, tipo, rank) riflette il fatto che due
-- giocatori non possono condividere la stessa posizione in gerarchia per lo
-- stesso tipo di calcio piazzato nella stessa squadra; lo stesso giocatore
-- può però comparire per più tipi (es. primo rigorista e primo punizionista).
CREATE TABLE set_piece_taker (
  id SERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('rigore', 'punizione', 'corner')),
  player_name TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1),
  CONSTRAINT set_piece_taker_team_tipo_rank_uk UNIQUE (team, tipo, rank)
);

-- Screenshot conservato per squadra: una riga per squadra, sovrascritta a
-- ogni nuovo upload (come probable_lineup_screenshot).
CREATE TABLE set_piece_taker_screenshot (
  team TEXT PRIMARY KEY,
  image BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE IF EXISTS set_piece_taker_screenshot;
DROP TABLE IF EXISTS set_piece_taker;
