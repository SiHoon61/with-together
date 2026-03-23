CREATE TYPE member_role AS ENUM ('leader', 'member');

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  final_goal TEXT NOT NULL,
  timezone TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(name)) > 0),
  CHECK (char_length(trim(final_goal)) > 0),
  CHECK (char_length(trim(timezone)) > 0),
  CHECK (char_length(trim(invite_token)) > 0)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  role member_role NOT NULL,
  recovery_key_hash TEXT NOT NULL,
  recovery_key_ciphertext TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(nickname)) > 0),
  CHECK (char_length(nickname) <= 24),
  CHECK (char_length(trim(recovery_key_hash)) > 0),
  CHECK (char_length(trim(recovery_key_ciphertext)) > 0),
  UNIQUE (id, room_id),
  UNIQUE (room_id, nickname)
);

CREATE UNIQUE INDEX members_one_leader_per_room_idx
  ON members (room_id)
  WHERE role = 'leader';

CREATE TABLE sessions (
  id BIGSERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > issued_at),
  CONSTRAINT sessions_member_fk
    FOREIGN KEY (member_id, room_id)
    REFERENCES members (id, room_id)
    ON DELETE CASCADE
);

CREATE TABLE recurring_quests (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(title)) > 0),
  CHECK (char_length(trim(description)) > 0),
  CHECK (sort_order >= 0),
  CONSTRAINT recurring_quests_room_fk
    FOREIGN KEY (room_id)
    REFERENCES rooms (id)
    ON DELETE CASCADE,
  CONSTRAINT recurring_quests_creator_fk
    FOREIGN KEY (created_by_member_id, room_id)
    REFERENCES members (id, room_id)
    ON DELETE RESTRICT,
  UNIQUE (id, room_id),
  UNIQUE (room_id, sort_order)
);

CREATE TABLE completions (
  member_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, quest_id, date),
  CONSTRAINT completions_member_fk
    FOREIGN KEY (member_id, room_id)
    REFERENCES members (id, room_id)
    ON DELETE CASCADE,
  CONSTRAINT completions_quest_fk
    FOREIGN KEY (quest_id, room_id)
    REFERENCES recurring_quests (id, room_id)
    ON DELETE CASCADE
);

CREATE INDEX sessions_member_id_idx
  ON sessions (member_id, expires_at DESC);

CREATE INDEX sessions_room_id_idx
  ON sessions (room_id, expires_at DESC);

CREATE INDEX recurring_quests_room_active_sort_idx
  ON recurring_quests (room_id, is_active, sort_order, created_at);

CREATE INDEX completions_room_date_idx
  ON completions (room_id, date);

CREATE INDEX completions_room_member_date_idx
  ON completions (room_id, member_id, date);

CREATE INDEX completions_room_quest_date_idx
  ON completions (room_id, quest_id, date);

CREATE TRIGGER rooms_set_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER members_set_updated_at
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER recurring_quests_set_updated_at
BEFORE UPDATE ON recurring_quests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER completions_set_updated_at
BEFORE UPDATE ON completions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
