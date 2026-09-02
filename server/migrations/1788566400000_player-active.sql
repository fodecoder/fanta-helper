-- Up Migration

-- Soft-delete dell'anagrafica: un giocatore assente da un re-import del listone
-- (svincolato o ceduto fuori Serie A) resta in tabella per non rompere i
-- riferimenti da `valuation`/`purchase`, ma esce dalle liste dei disponibili.
ALTER TABLE player ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Down Migration

ALTER TABLE player DROP COLUMN IF EXISTS active;
