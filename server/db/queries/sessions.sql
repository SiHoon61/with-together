-- name: CreateSession :one
INSERT INTO sessions (
  member_id,
  room_id,
  session_token_hash,
  issued_at,
  expires_at,
  last_seen_at
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

-- name: GetSessionByTokenHash :one
SELECT *
FROM sessions
WHERE session_token_hash = $1
LIMIT 1;

-- name: GetActiveSessionByTokenHash :one
SELECT *
FROM sessions
WHERE session_token_hash = $1
  AND revoked_at IS NULL
  AND expires_at > NOW()
LIMIT 1;

-- name: GetActiveSessionAuthContextByTokenHash :one
SELECT
  s.id AS session_id,
  s.member_id,
  s.room_id,
  s.session_token_hash,
  s.issued_at,
  s.expires_at,
  s.last_seen_at,
  s.revoked_at,
  m.nickname,
  m.role,
  m.joined_at,
  r.name AS room_name,
  r.final_goal,
  r.daily_goal_cutoff_percent,
  r.timezone,
  r.invite_token
FROM sessions s
JOIN members m
  ON m.id = s.member_id
 AND m.room_id = s.room_id
JOIN rooms r
  ON r.id = s.room_id
WHERE s.session_token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > NOW()
  AND m.removed_at IS NULL
LIMIT 1;

-- name: TouchSession :exec
UPDATE sessions
SET last_seen_at = $2
WHERE session_token_hash = $1;

-- name: RevokeSessionByTokenHash :exec
UPDATE sessions
SET revoked_at = $2
WHERE session_token_hash = $1
  AND revoked_at IS NULL;

-- name: RevokeSessionsByMemberID :exec
UPDATE sessions
SET revoked_at = $2
WHERE member_id = $1
  AND revoked_at IS NULL;

-- name: DeleteExpiredSessions :execrows
DELETE FROM sessions
WHERE expires_at <= $1
   OR revoked_at IS NOT NULL;
