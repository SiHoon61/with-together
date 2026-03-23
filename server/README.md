# Server Setup

이 디렉터리는 Go API 서버를 담는다.

## 현재 포함된 것

- OpenAPI 생성물:
  - [types.gen.go](/Users/imsihun/Documents/Playground/server/internal/api/types.gen.go)
  - [server.gen.go](/Users/imsihun/Documents/Playground/server/internal/api/server.gen.go)
- Postgres 마이그레이션:
  - [migrations](/Users/imsihun/Documents/Playground/server/db/migrations)
- `sqlc` 쿼리와 생성물:
  - [queries](/Users/imsihun/Documents/Playground/server/db/queries)
  - [sqlc](/Users/imsihun/Documents/Playground/server/internal/store/sqlc)
- 설정 로더:
  - [config.go](/Users/imsihun/Documents/Playground/server/internal/config/config.go)
- Postgres 연결:
  - [postgres.go](/Users/imsihun/Documents/Playground/server/internal/postgres/postgres.go)
- Store 래퍼:
  - [store.go](/Users/imsihun/Documents/Playground/server/internal/store/store.go)
- 서비스 레이어:
  - [service.go](/Users/imsihun/Documents/Playground/server/internal/service/service.go)
- HTTP 핸들러:
  - [handler.go](/Users/imsihun/Documents/Playground/server/internal/httpapi/handler.go)
- 부트스트랩 엔트리:
  - [main.go](/Users/imsihun/Documents/Playground/server/cmd/api/main.go)

## 환경 변수

예시는 [.env.example](/Users/imsihun/Documents/Playground/server/.env.example) 참고.

- `APP_ENV`
- `PORT`
- `STATIC_DIR`: Vite 빌드 결과물 위치. 기본값 `../web/dist`
- `RUN_MIGRATIONS`: 시작 시 마이그레이션 자동 실행 여부. 배포에서는 `true` 권장
- `MIGRATIONS_PATH`: 마이그레이션 파일 경로. 기본값 `db/migrations`
- `DATABASE_URL`
- `DATABASE_MAX_CONNS`
- `DATABASE_MIN_CONNS`
- `DATABASE_MAX_CONN_LIFETIME`
- `DATABASE_MAX_CONN_IDLE_TIME`
- `LOG_FILE` (선택): 회전 로그 파일 경로. 비우면 표준 출력만 사용
- `LOG_MAX_SIZE_MB`, `LOG_MAX_BACKUPS`, `LOG_MAX_AGE_DAYS`, `LOG_COMPRESS`

## 로컬 작업 순서

1. Postgres 실행
2. 마이그레이션 적용

```bash
migrate -path server/db/migrations -database "$DATABASE_URL" up
```

3. `sqlc` 생성물 갱신

```bash
cd server
sqlc generate
```

4. OpenAPI 생성물 갱신

```bash
oapi-codegen -config api-spec/oapi-types.cfg.yaml api-spec/openapi.yaml
oapi-codegen -config api-spec/oapi-server.cfg.yaml api-spec/openapi.yaml
```

5. 서버 실행

```bash
cd server
go run ./cmd/api
```

실시간 재빌드·재실행은 [Air](https://github.com/air-verse/air) 사용:

```bash
go install github.com/air-verse/air@latest
cd server
air
```

설정은 [`.air.toml`](./.air.toml)을 따른다.

## Railway 단일 이미지 배포

루트의 [Dockerfile](/Users/imsihun/Documents/Playground/Dockerfile)은 다음을 한 이미지로 묶는다.

- `web` Vite 빌드 결과물
- Go API 서버 바이너리
- Postgres 마이그레이션 파일

배포 시 권장 환경 변수:

- `PORT`
- `DATABASE_URL`
- `RUN_MIGRATIONS=true`
- `STATIC_DIR=/app/web/dist`
- `MIGRATIONS_PATH=/app/server/db/migrations`

이 구성에서는 Go 서버가 `/v1/*`, `/healthz` 는 API로 처리하고, 나머지 경로는 `web/dist` 정적 파일과 SPA fallback으로 서빙한다.

## 다음 구현 포인트

- `ServerInterface` 구현체 추가
- 인증 미들웨어 추가
- store 쿼리를 조합하는 service 레이어 추가
- DTO 매핑 추가
