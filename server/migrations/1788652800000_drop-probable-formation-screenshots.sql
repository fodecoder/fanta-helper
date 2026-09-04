-- Up Migration

-- L'estrazione via screenshot + Claude per probabili formazioni e tiratori è
-- stata sostituita da un import JSON scritto dall'utente (vedi
-- shared/probableFormationImport.ts): gli screenshot conservati non servono
-- più a nessun endpoint.
DROP TABLE IF EXISTS probable_lineup_screenshot;
DROP TABLE IF EXISTS set_piece_taker_screenshot;

-- Down Migration

CREATE TABLE probable_lineup_screenshot (
  team TEXT PRIMARY KEY,
  image BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE set_piece_taker_screenshot (
  team TEXT PRIMARY KEY,
  image BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
