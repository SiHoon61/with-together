-- name: CreateRoom :one
INSERT INTO rooms (
  id,
  name,
  final_goal,
  final_goal_date,
  visibility,
  timezone,
  invite_token
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

-- name: GetRoomByID :one
SELECT *
FROM rooms
WHERE id = $1
LIMIT 1;

-- name: GetRoomByInviteToken :one
SELECT *
FROM rooms
WHERE invite_token = $1
LIMIT 1;

-- name: GetRoomSummaryByID :one
SELECT
  r.id,
  r.name,
  r.final_goal,
  r.final_goal_date,
  r.daily_goal_cutoff_percent,
  r.visibility,
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
      AND m.removed_at IS NULL
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
      AND m.removed_at IS NULL
  ) AS member_count,
  r.created_at,
  r.updated_at
FROM rooms r
WHERE r.id = $1
LIMIT 1;

-- name: GetRoomSummaryByInviteToken :one
SELECT
  r.id,
  r.name,
  r.final_goal,
  r.final_goal_date,
  r.daily_goal_cutoff_percent,
  r.visibility,
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
      AND m.removed_at IS NULL
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
      AND m.removed_at IS NULL
  ) AS member_count,
  r.created_at,
  r.updated_at
FROM rooms r
WHERE r.invite_token = $1
LIMIT 1;

-- name: ListRoomSummaries :many
SELECT
  r.id,
  r.name,
  r.final_goal,
  r.final_goal_date,
  r.daily_goal_cutoff_percent,
  r.visibility,
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
      AND m.removed_at IS NULL
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
      AND m.removed_at IS NULL
  ) AS member_count,
  r.created_at,
  r.updated_at
FROM rooms r
WHERE r.visibility = 'public'
ORDER BY r.created_at DESC;

-- name: UpdateRoom :one
UPDATE rooms
SET
  name = $2,
  final_goal = $3,
  final_goal_date = $4,
  daily_goal_cutoff_percent = $5,
  visibility = $6,
  timezone = $7
WHERE id = $1
RETURNING *;

-- name: RotateInviteToken :one
UPDATE rooms
SET invite_token = $2
WHERE id = $1
RETURNING *;

-- name: CreateRoomDailyGoalCutoffRevision :one
INSERT INTO room_daily_goal_cutoff_revisions (
  room_id,
  cutoff_percent,
  started_at
)
VALUES (
  $1,
  $2,
  $3
)
RETURNING *;

-- name: CloseCurrentRoomDailyGoalCutoffRevision :exec
UPDATE room_daily_goal_cutoff_revisions
SET ended_at = $2
WHERE room_id = $1
  AND ended_at IS NULL;

-- name: GetRoomDailyGoalCutoffAtTimestamp :one
SELECT cutoff_percent
FROM room_daily_goal_cutoff_revisions
WHERE room_id = $1
  AND started_at < $2
  AND (ended_at IS NULL OR ended_at >= $2)
ORDER BY started_at DESC
LIMIT 1;
