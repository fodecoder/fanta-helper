-- Up Migration

-- fanta_id: id ufficiale Fantacalcio (colonna `Id` dei listoni). Chiave di
-- join stabile per unire quotazioni/statistiche storiche allo stesso
-- giocatore, senza affidarsi al matching per name+team (fragile con
-- trasferimenti/grafie). Nullable: i giocatori già in pool prima di questa
-- migrazione non hanno ancora un fanta_id finché un file non lo fornisce.
ALTER TABLE player ADD COLUMN fanta_id INTEGER;
ALTER TABLE player ADD CONSTRAINT player_fanta_id_uk UNIQUE (fanta_id);

-- Quotazioni per stagione: riferimento globale, non per-lega. Import a
-- sostituzione per stagione (delete+insert in transazione), mai upsert
-- riga-per-riga, così un reimport riflette esattamente l'ultimo file per
-- quella stagione. Nessun id surrogato: a differenza di set_piece_taker
-- (che serve un id stabile per screenshot e revisione a due passi), qui non
-- c'è alcun id client-visibile, quindi la primary key composita riflette
-- esattamente le colonne di SPEC.md.
CREATE TABLE quotation (
  player_id INTEGER NOT NULL REFERENCES player (id),
  season TEXT NOT NULL,
  qt_i INTEGER,
  qt_a INTEGER,
  fvm INTEGER,
  PRIMARY KEY (player_id, season)
);

-- Statistiche per stagione: solo storico (nessun trigger "stagione
-- corrente" -- una stagione in corso non ha statistiche complete finché
-- non è finita). Stessa politica di sostituzione per stagione di
-- `quotation`.
CREATE TABLE player_season_stats (
  player_id INTEGER NOT NULL REFERENCES player (id),
  season TEXT NOT NULL,
  presenze INTEGER,
  mv NUMERIC,
  fm NUMERIC,
  gf INTEGER,
  gs INTEGER,
  assist INTEGER,
  rp INTEGER,
  rc INTEGER,
  rig_plus INTEGER,
  rig_minus INTEGER,
  amm INTEGER,
  esp INTEGER,
  autogol INTEGER,
  PRIMARY KEY (player_id, season)
);

-- Down Migration

DROP TABLE IF EXISTS player_season_stats;
DROP TABLE IF EXISTS quotation;
ALTER TABLE player DROP CONSTRAINT IF EXISTS player_fanta_id_uk;
ALTER TABLE player DROP COLUMN IF EXISTS fanta_id;
