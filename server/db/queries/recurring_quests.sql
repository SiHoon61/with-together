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

-- name: GetRecurringQuestByID :one
SELECT *
FROM recurring_quests
WHERE room_id = $1
  AND id = $2
LIMIT 1;

-- name: ListRecurringQuestsByRoomID :many
SELECT *
FROM recurring_quests
WHERE room_id = $1
ORDER BY sort_order ASC, created_at ASC, id ASC;

-- name: ListActiveRecurringQuestsByRoomID :many
SELECT *
FROM recurring_quests
WHERE room_id = $1
  AND is_active = TRUE
ORDER BY sort_order ASC, created_at ASC, id ASC;

-- name: GetNextRecurringQuestSortOrder :one
SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next_sort_order
FROM recurring_quests
WHERE room_id = $1;

-- name: UpdateRecurringQuest :one
UPDATE recurring_quests
SET
  title = $3,
  description = $4,
  sort_order = $5,
  is_active = $6
WHERE room_id = $1
  AND id = $2
RETURNING *;
