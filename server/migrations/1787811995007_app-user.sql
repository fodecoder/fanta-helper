-- Up Migration

CREATE TABLE app_user (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  avatar_color TEXT,
  CONSTRAINT app_user_username_uk UNIQUE (username)
);

-- Down Migration

DROP TABLE IF EXISTS app_user;
