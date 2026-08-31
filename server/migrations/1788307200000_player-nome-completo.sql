-- Up Migration
-- Nome completo del giocatore dal listone FantaAsta (colonna posizionale 3).
-- Additiva e nullable: le righe pre-listone restano NULL, nessun default
-- inventato. `name` resta il nome breve usato per matching/ricerca.
ALTER TABLE player ADD COLUMN nome_completo TEXT;

-- Down Migration
ALTER TABLE player DROP COLUMN nome_completo;
