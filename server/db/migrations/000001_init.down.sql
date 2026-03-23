DROP TRIGGER IF EXISTS completions_set_updated_at ON completions;
DROP TRIGGER IF EXISTS recurring_quests_set_updated_at ON recurring_quests;
DROP TRIGGER IF EXISTS members_set_updated_at ON members;
DROP TRIGGER IF EXISTS rooms_set_updated_at ON rooms;

DROP INDEX IF EXISTS completions_room_quest_date_idx;
DROP INDEX IF EXISTS completions_room_member_date_idx;
DROP INDEX IF EXISTS completions_room_date_idx;
DROP INDEX IF EXISTS recurring_quests_room_active_sort_idx;
DROP INDEX IF EXISTS sessions_room_id_idx;
DROP INDEX IF EXISTS sessions_member_id_idx;
DROP INDEX IF EXISTS members_one_leader_per_room_idx;

DROP TABLE IF EXISTS completions;
DROP TABLE IF EXISTS recurring_quests;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS rooms;

DROP FUNCTION IF EXISTS set_updated_at();
DROP TYPE IF EXISTS member_role;
