CREATE TYPE room_visibility AS ENUM ('public', 'private');

ALTER TABLE rooms
ADD COLUMN visibility room_visibility NOT NULL DEFAULT 'public';

ALTER TABLE members
ADD COLUMN removed_at TIMESTAMPTZ;

ALTER TABLE members
DROP CONSTRAINT members_room_id_nickname_key;

CREATE UNIQUE INDEX members_active_nickname_unique_idx
  ON members (room_id, nickname)
  WHERE removed_at IS NULL;

CREATE INDEX members_room_snapshot_idx
  ON members (room_id, joined_at, removed_at);

ALTER TABLE recurring_quests
ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX recurring_quests_room_snapshot_idx
  ON recurring_quests (room_id, created_at, archived_at);

CREATE TABLE recurring_quest_versions (
  id BIGSERIAL PRIMARY KEY,
  quest_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(title)) > 0),
  CHECK (char_length(trim(description)) > 0),
  CHECK (sort_order >= 0),
  CONSTRAINT recurring_quest_versions_quest_fk
    FOREIGN KEY (quest_id, room_id)
    REFERENCES recurring_quests (id, room_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX recurring_quest_versions_current_unique_idx
  ON recurring_quest_versions (quest_id, room_id)
  WHERE ended_at IS NULL;

CREATE INDEX recurring_quest_versions_snapshot_idx
  ON recurring_quest_versions (room_id, started_at, ended_at);

INSERT INTO recurring_quest_versions (
  quest_id,
  room_id,
  title,
  description,
  sort_order,
  started_at,
  created_at
)
SELECT
  id,
  room_id,
  title,
  description,
  sort_order,
  created_at,
  created_at
FROM recurring_quests;

CREATE TABLE room_daily_goal_cutoff_revisions (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  cutoff_percent INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (cutoff_percent BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX room_daily_goal_cutoff_revisions_current_unique_idx
  ON room_daily_goal_cutoff_revisions (room_id)
  WHERE ended_at IS NULL;

CREATE INDEX room_daily_goal_cutoff_revisions_snapshot_idx
  ON room_daily_goal_cutoff_revisions (room_id, started_at, ended_at);

INSERT INTO room_daily_goal_cutoff_revisions (
  room_id,
  cutoff_percent,
  started_at,
  created_at
)
SELECT
  id,
  daily_goal_cutoff_percent,
  created_at,
  created_at
FROM rooms;
