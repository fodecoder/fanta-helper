-- Up Migration

-- Log immutabile dei messaggi 1-a-1. Append-only: il codice applicativo esegue
-- solo INSERT e SELECT. La conversazione è la proiezione ordinata di queste
-- righe, nessun campo di stato (letto/non letto, contatori) è ammesso.

CREATE TABLE chat_message (
  id         BIGSERIAL PRIMARY KEY,
  from_user  INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  to_user    INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_message_not_self CHECK (from_user <> to_user)
);

-- Chiave di coppia simmetrica: entrambe le direzioni della stessa
-- conversazione ricadono sullo stesso prefisso di indice.
CREATE INDEX idx_chat_message_pair ON chat_message
  (LEAST(from_user, to_user), GREATEST(from_user, to_user), created_at, id);

-- Down Migration

DROP TABLE IF EXISTS chat_message;
