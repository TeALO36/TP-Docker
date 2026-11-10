
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  pseudo        VARCHAR(16)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE games (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  gradient    TEXT NOT NULL,
  how_to      TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE scores (
  id               BIGSERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_slug        TEXT    NOT NULL REFERENCES games(slug) ON DELETE CASCADE,
  score            INTEGER NOT NULL CHECK (score >= 0 AND score <= 100000),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 7200),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_classement ON scores (game_slug, score DESC);
CREATE INDEX idx_scores_joueur ON scores (user_id, created_at DESC);

CREATE TABLE progress (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_slug      TEXT    NOT NULL REFERENCES games(slug) ON DELETE CASCADE,
  best_score     INTEGER NOT NULL DEFAULT 0,
  games_played   INTEGER NOT NULL DEFAULT 0,
  total_seconds  INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_slug)
);
