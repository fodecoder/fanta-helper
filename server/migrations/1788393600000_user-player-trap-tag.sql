-- Up Migration

-- Flag "trappola" manuale per-utente/lega. Tabella sparsa e additiva: la riga
-- esiste solo se l'utente ha marcato quel giocatore. Nessun campo di stato
-- derivato — è solo un flag di visualizzazione, non tocca `valuation`.

CREATE TABLE user_player_trap_tag (
  user_id   INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES league(id)   ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES player(id)   ON DELETE CASCADE,
  PRIMARY KEY (user_id, league_id, player_id)
);

-- Down Migration

DROP TABLE IF EXISTS user_player_trap_tag;
