# SQLC Queries

이 디렉터리는 `sqlc`가 읽을 SQL 쿼리를 모아둔다.

현재 분리는 아래처럼 잡혀 있다.

- `rooms.sql`
- `members.sql`
- `sessions.sql`
- `recurring_quests.sql`
- `completions.sql`

## 생성 명령어

```bash
cd server
sqlc generate
```

## 생성 위치

생성 결과는 아래로 나간다.

- [sqlc](/Users/imsihun/Documents/Playground/server/internal/store/sqlc)

## 메모

- 스키마는 `db/migrations`의 `*.up.sql`을 기준으로 읽는다
- 마이그레이션이 바뀌면 `sqlc generate`를 다시 실행해야 한다
- API 응답에서 계산되는 값인 `leaderMemberId`, `memberCount`는 쿼리에서 조합해서 만들 계획이다
