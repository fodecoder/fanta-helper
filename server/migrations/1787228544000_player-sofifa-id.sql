-- Up Migration

-- sofifa_id: id numerico del giocatore su SoFIFA (api.sofifa.net/player/{id}).
-- L'API SoFIFA non espone una ricerca per nome/squadra: gli attributi EA FC si
-- recuperano solo per id. Questa colonna è la chiave di join verso quell'id,
-- popolata dal seed `db:seed:sofifa` (match per nome+squadra sulle rose Serie A)
-- o manualmente. Nullable: un giocatore senza mapping semplicemente non riceve
-- attributi, senza degradare nulla. Provider opzionale e disattivabile.
ALTER TABLE player ADD COLUMN sofifa_id INTEGER;
ALTER TABLE player ADD CONSTRAINT player_sofifa_id_uk UNIQUE (sofifa_id);

-- Down Migration

ALTER TABLE player DROP CONSTRAINT IF EXISTS player_sofifa_id_uk;
ALTER TABLE player DROP COLUMN IF EXISTS sofifa_id;
