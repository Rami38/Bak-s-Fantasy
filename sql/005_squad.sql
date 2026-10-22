CREATE TABLE IF NOT EXISTS manager_squad (
  user_id INTEGER NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES season (id),
  player_ids INTEGER[] NOT NULL DEFAULT '{}',
  formation TEXT NOT NULL DEFAULT '4-3-3',
  captain_id INTEGER REFERENCES player (id),
  vice_id INTEGER REFERENCES player (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);
