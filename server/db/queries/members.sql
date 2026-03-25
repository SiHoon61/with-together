-- name: CreateMember :one
INSERT INTO members (
  id,
  room_id,
  nickname,
  role
)
VALUES (
  $1,
  $2,
  $3,
  $4
)
RETURNING *;

-- name: GetMemberByID :one
SELECT *
FROM members
WHERE id = $1
  AND removed_at IS NULL
LIMIT 1;

-- name: GetMemberByRoomAndID :one
SELECT *
FROM members
WHERE room_id = $1
  AND id = $2
  AND removed_at IS NULL
LIMIT 1;

-- name: GetMemberByRoomAndNickname :one
SELECT *
FROM members
WHERE room_id = $1
  AND nickname = $2
  AND removed_at IS NULL
LIMIT 1;

-- name: ListMembersByRoomID :many
SELECT *
FROM members
WHERE room_id = $1
  AND removed_at IS NULL
ORDER BY role ASC, joined_at ASC, id ASC;

-- name: CountMembersByRoomID :one
SELECT COUNT(*)::int AS member_count
FROM members
WHERE room_id = $1
  AND removed_at IS NULL;

-- name: GetLeaderByRoomID :one
SELECT *
FROM members
WHERE room_id = $1
  AND role = 'leader'
  AND removed_at IS NULL
LIMIT 1;

-- name: ListMembersByRoomIDAtTimestamp :many
SELECT *
FROM members
WHERE room_id = $1
  AND joined_at < $2
  AND (removed_at IS NULL OR removed_at >= $2)
ORDER BY role ASC, joined_at ASC, id ASC;

-- name: RemoveMemberByRoomAndID :one
UPDATE members
SET removed_at = $3
WHERE room_id = $1
  AND id = $2
  AND removed_at IS NULL
RETURNING *;
