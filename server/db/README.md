# Database Design

이 디렉터리는 Postgres 스키마와 마이그레이션을 관리한다.

## 마이그레이션 도구

- Postgres
- `golang-migrate/migrate`
- `sqlc`

## 현재 스키마 개요

### `rooms`

방의 기본 정보와 현재 활성 초대 토큰을 저장한다.

- `invite_token`은 현재 유효한 초대 링크 토큰이다
- `leaderMemberId`, `memberCount`는 저장하지 않고 조회 시 계산한다
- `timezone`은 방의 하루 경계를 계산할 때 사용한다

### `members`

방 참가자를 저장한다.

- 방 안에서 `nickname`은 유일하다
- 방마다 `leader`는 1명만 허용한다

### `sessions`

브라우저 단위 세션을 저장한다.

- 세션 토큰 자체는 저장하지 않고 `session_token_hash`만 저장한다
- 한 멤버는 여러 세션을 가질 수 있다
- 세션 만료는 `expires_at`으로 관리한다
- 필요 시 `revoked_at`으로 개별 세션 폐기가 가능하다

### `recurring_quests`

방의 반복 퀘스트를 저장한다.

- 방마다 여러 개 생성 가능
- 정렬은 `sort_order`로 관리한다
- 삭제 대신 `is_active = false`로 비활성화하는 운영에 잘 맞는다

### `completions`

반복 퀘스트의 날짜별 완료 기록을 저장한다.

- 동일 멤버는 같은 날짜에 같은 퀘스트를 한 번만 완료할 수 있다
- 기본 키는 `(member_id, quest_id, date)`다
- `room_id`를 함께 저장해 방 기준 조회 성능과 정합성을 모두 챙긴다

## 마이그레이션 파일

- [000001_init.up.sql](/Users/imsihun/Documents/Playground/server/db/migrations/000001_init.up.sql)
- [000001_init.down.sql](/Users/imsihun/Documents/Playground/server/db/migrations/000001_init.down.sql)
- [000004_remove_member_recovery_columns.up.sql](/Users/imsihun/Documents/Playground/server/db/migrations/000004_remove_member_recovery_columns.up.sql)
- [000004_remove_member_recovery_columns.down.sql](/Users/imsihun/Documents/Playground/server/db/migrations/000004_remove_member_recovery_columns.down.sql)

## 예시 명령어

루트에서 직접 실행하는 예시:

```bash
migrate -path server/db/migrations -database "$DATABASE_URL" up
```

한 단계만 되돌리는 예시:

```bash
migrate -path server/db/migrations -database "$DATABASE_URL" down 1
```

`sqlc` 생성 예시:

```bash
cd server
sqlc generate
```

## 구현 메모

- `rooms.leader_member_id`를 따로 저장하지 않고 `members.role = 'leader'`에서 계산한다
- `rooms.member_count`를 따로 저장하지 않고 `COUNT(*)`로 계산한다
- 세션 토큰 원문은 애플리케이션에서 생성하고, DB에는 `session_token_hash`만 저장한다
- SQL 함수/메서드 생성은 [sqlc.yaml](/Users/imsihun/Documents/Playground/server/sqlc.yaml) 을 기준으로 진행한다
