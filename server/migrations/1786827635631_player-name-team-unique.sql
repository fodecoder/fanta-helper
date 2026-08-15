-- Up Migration

ALTER TABLE player ADD CONSTRAINT player_name_team_uk UNIQUE (name, team);

-- Down Migration

ALTER TABLE player DROP CONSTRAINT player_name_team_uk;