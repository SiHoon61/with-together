-- name: CreateRoom :one
INSERT INTO rooms (
  id,
  name,
  final_goal,
  final_goal_date,
  timezone,
  invite_token
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
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
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
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
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
  r.timezone,
  r.invite_token,
  (
    SELECT m.id
    FROM members m
    WHERE m.room_id = r.id
      AND m.role = 'leader'
    LIMIT 1
  ) AS leader_member_id,
  (
    SELECT COUNT(*)::int
    FROM members m
    WHERE m.room_id = r.id
  ) AS member_count,
  r.created_at,
  r.updated_at
FROM rooms r
ORDER BY r.created_at DESC;

-- name: UpdateRoom :one
UPDATE rooms
SET
  name = $2,
  final_goal = $3,
  final_goal_date = $4,
  daily_goal_cutoff_percent = $5,
  timezone = $6
WHERE id = $1
RETURNING *;

-- name: RotateInviteToken :one
UPDATE rooms
SET invite_token = $2
WHERE id = $1
RETURNING *;
