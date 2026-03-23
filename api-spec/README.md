# API Spec Workflow

이 디렉터리는 API의 단일 진실의 원천이다.

- 스펙 파일: `openapi.yaml`
- Go 타입 생성물: `../server/internal/api/types.gen.go`
- Go 서버 인터페이스 생성물: `../server/internal/api/server.gen.go`
- TypeScript 스키마 생성물: `../web/src/generated/schema.d.ts`

## 사용 버전

- OpenAPI: `3.0.3`
- `oapi-codegen`: `v2.5.x`
- `openapi-typescript`: `v7.x`
- Go: `1.22+`
- Node.js: `20.x+`

## 생성 명령어

### Go 타입 생성

```bash
oapi-codegen -config api-spec/oapi-types.cfg.yaml api-spec/openapi.yaml
```

### Go 서버 인터페이스 생성

```bash
oapi-codegen -config api-spec/oapi-server.cfg.yaml api-spec/openapi.yaml
```

### TypeScript 타입 생성

```bash
npx openapi-typescript api-spec/openapi.yaml -o web/src/generated/schema.d.ts
```

## 권장 운영 방식

1. API 변경은 항상 `openapi.yaml`에서 먼저 수정한다.
2. 생성 파일을 다시 만든다.
3. Go에서는 생성된 인터페이스 위에 비즈니스 로직을 구현한다.
4. Web에서는 생성된 타입 위에 axios 래퍼와 React 컴포넌트를 구현한다.

## 주의 사항

- `oapi-codegen`의 `output` 경로는 명령을 실행한 현재 디렉터리 기준으로 해석된다.
- 이 저장소에서는 위 명령을 모노레포 루트에서 실행하는 것을 기준으로 설정해두었다.
- `std-http-server` 생성 시 `go.mod`가 없으면 경고가 뜰 수 있다. 이 경고는 생성 자체를 막지는 않지만, 이후 서버 구현 전에 `server/go.mod`를 두는 것을 권장한다.

## 디렉터리 구조

```text
api-spec/
  openapi.yaml
  oapi-types.cfg.yaml
  oapi-server.cfg.yaml
server/
  internal/
    api/
      types.gen.go
      server.gen.go
web/
  src/
    generated/
      schema.d.ts
```
