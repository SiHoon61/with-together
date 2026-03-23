-- name: UpsertCompletion :one
INSERT INTO completions (
  member_id,
  quest_id,
  room_id,
  date,
  completed_at,
  note
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
ON CONFLICT (member_id, quest_id, date)
DO UPDATE
SET
  completed_at = EXCLUDED.completed_at,
  note = EXCLUDED.note
RETURNING *;

-- name: GetCompletion :one
SELECT *
FROM completions
WHERE member_id = $1
  AND quest_id = $2
  AND date = $3
LIMIT 1;

-- name: DeleteCompletion :execrows
DELETE FROM completions
WHERE member_id = $1
  AND quest_id = $2
  AND date = $3;

-- name: ListCompletionsByRoomAndDate :many
SELECT *
FROM completions
WHERE room_id = $1
  AND date = $2
ORDER BY completed_at ASC, member_id ASC, quest_id ASC;

-- name: ListCompletionsByRoomAndDateRange :many
SELECT *
FROM completions
WHERE room_id = sqlc.arg(room_id)
  AND date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND (sqlc.narg(quest_id)::text IS NULL OR quest_id = sqlc.narg(quest_id)::text)
  AND (sqlc.narg(member_id)::text IS NULL OR member_id = sqlc.narg(member_id)::text)
ORDER BY date DESC, completed_at DESC, member_id ASC, quest_id ASC;
