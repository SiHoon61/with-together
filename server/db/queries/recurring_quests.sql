-- name: CreateRecurringQuest :one
INSERT INTO recurring_quests (
  id,
  room_id,
  title,
  description,
  sort_order,
  is_active,
  created_by_member_id
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
RETURNING *;

-- name: CreateRecurringQuestVersion :one
INSERT INTO recurring_quest_versions (
  quest_id,
  room_id,
  title,
  description,
  sort_order,
  started_at
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING *;

-- name: CloseCurrentRecurringQuestVersion :exec
UPDATE recurring_quest_versions
SET ended_at = $3
WHERE room_id = $1
  AND quest_id = $2
  AND ended_at IS NULL;

-- name: GetRecurringQuestByID :one
SELECT *
FROM recurring_quests
WHERE room_id = $1
  AND id = $2
  AND archived_at IS NULL
LIMIT 1;

-- name: ListRecurringQuestsByRoomID :many
SELECT *
FROM recurring_quests
WHERE room_id = $1
  AND archived_at IS NULL
ORDER BY sort_order ASC, created_at ASC, id ASC;

-- name: ListActiveRecurringQuestsByRoomID :many
SELECT *
FROM recurring_quests
WHERE room_id = $1
  AND archived_at IS NULL
  AND is_active = TRUE
ORDER BY sort_order ASC, created_at ASC, id ASC;

-- name: ListRecurringQuestsByRoomIDAtTimestamp :many
SELECT
  q.id,
  q.room_id,
  v.title,
  v.description,
  TRUE AS is_active,
  v.sort_order,
  q.created_by_member_id,
  q.created_at,
  COALESCE(v.ended_at, q.updated_at) AS updated_at
FROM recurring_quests q
JOIN recurring_quest_versions v
  ON v.quest_id = q.id
 AND v.room_id = q.room_id
WHERE q.room_id = $1
  AND q.created_at < $2
  AND (q.archived_at IS NULL OR q.archived_at >= $2)
  AND v.started_at < $2
  AND (v.ended_at IS NULL OR v.ended_at >= $2)
ORDER BY v.sort_order ASC, q.created_at ASC, q.id ASC;

-- name: GetNextRecurringQuestSortOrder :one
SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next_sort_order
FROM recurring_quests
WHERE room_id = $1
  AND archived_at IS NULL;

-- name: UpdateRecurringQuest :one
UPDATE recurring_quests
SET
  title = $3,
  description = $4,
  sort_order = $5
WHERE room_id = $1
  AND id = $2
  AND archived_at IS NULL
RETURNING *;

-- name: ArchiveRecurringQuest :one
UPDATE recurring_quests
SET
  archived_at = $3,
  is_active = FALSE
WHERE room_id = $1
  AND id = $2
  AND archived_at IS NULL
RETURNING *;
