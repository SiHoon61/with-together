DELETE FROM room_daily_goal_cutoff_revisions;
DROP INDEX IF EXISTS room_daily_goal_cutoff_revisions_snapshot_idx;
DROP INDEX IF EXISTS room_daily_goal_cutoff_revisions_current_unique_idx;
DROP TABLE IF EXISTS room_daily_goal_cutoff_revisions;

DELETE FROM recurring_quest_versions;
DROP INDEX IF EXISTS recurring_quest_versions_snapshot_idx;
DROP INDEX IF EXISTS recurring_quest_versions_current_unique_idx;
DROP TABLE IF EXISTS recurring_quest_versions;

DROP INDEX IF EXISTS recurring_quests_room_snapshot_idx;
ALTER TABLE recurring_quests
DROP COLUMN IF EXISTS archived_at;

DROP INDEX IF EXISTS members_room_snapshot_idx;
DROP INDEX IF EXISTS members_active_nickname_unique_idx;

ALTER TABLE members
DROP COLUMN IF EXISTS removed_at;

ALTER TABLE members
ADD CONSTRAINT members_room_id_nickname_key UNIQUE (room_id, nickname);

ALTER TABLE rooms
DROP COLUMN IF EXISTS visibility;

DROP TYPE IF EXISTS room_visibility;
