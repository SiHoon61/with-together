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
LIMIT 1;

-- name: GetMemberByRoomAndID :one
SELECT *
FROM members
WHERE room_id = $1
  AND id = $2
LIMIT 1;

-- name: GetMemberByRoomAndNickname :one
SELECT *
FROM members
WHERE room_id = $1
  AND nickname = $2
LIMIT 1;

-- name: ListMembersByRoomID :many
SELECT *
FROM members
WHERE room_id = $1
ORDER BY role ASC, joined_at ASC, id ASC;

-- name: CountMembersByRoomID :one
SELECT COUNT(*)::int AS member_count
FROM members
WHERE room_id = $1;

-- name: GetLeaderByRoomID :one
SELECT *
FROM members
WHERE room_id = $1
  AND role = 'leader'
LIMIT 1;

-- name: DeleteMemberByRoomAndID :exec
DELETE FROM members
WHERE room_id = $1
  AND id = $2;
