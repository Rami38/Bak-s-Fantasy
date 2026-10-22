CREATE TABLE IF NOT EXISTS season (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  matchday_count INTEGER NOT NULL,
  provider_league_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS club (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES season (id),
  provider_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  UNIQUE (season_id, provider_id)
);

CREATE TABLE IF NOT EXISTS player (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('goalkeeper', 'defender', 'midfielder', 'forward'))
);

CREATE TABLE IF NOT EXISTS player_club_stint (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player (id),
  club_id INTEGER NOT NULL REFERENCES club (id),
  season_id INTEGER NOT NULL REFERENCES season (id),
  from_gameweek INTEGER NOT NULL,
  to_gameweek INTEGER,
  price_tenths INTEGER,
  UNIQUE (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS fixture (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES season (id),
  provider_id INTEGER NOT NULL,
  matchday INTEGER NOT NULL,
  home_club_id INTEGER NOT NULL REFERENCES club (id),
  away_club_id INTEGER NOT NULL REFERENCES club (id),
  kickoff TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  UNIQUE (season_id, provider_id)
);

CREATE INDEX IF NOT EXISTS fixture_season_matchday ON fixture (season_id, matchday, kickoff);
