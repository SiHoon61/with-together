# 퀘스트 방 — React UI (API 연동 버전)

## 시작하기

```bash
npm install
cp .env.example .env.local   # API 주소 설정
npm run dev
```

## 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | API 서버 주소. 비워두면 same-origin 호출을 사용하고, Vite dev 서버에서는 `localhost:8080`으로 프록시됩니다. |
| `VITE_DEV_INVITE_TOKEN` | 개발용 초대 토큰 |

## 인증 방식

세션 토큰 / roomId / memberId 를 localStorage에 저장하고,
모든 API 요청에 `Authorization: Bearer {token}` 헤더를 자동 첨부합니다.

## 화면별 사용 API

| 화면 | 사용 API |
|------|----------|
| Dashboard | `GET /v1/rooms/{roomId}` + PUT/DELETE completions |
| Home | `GET /v1/rooms` |
| JoinRoom | `GET /v1/invites/{token}` + POST join |
| AccessTransfer | API 없이 로컬 세션 번들 URL 생성 |
| AccessImport | API 없이 로컬 세션 번들 가져오기 |
| History | `GET /v1/rooms/{roomId}/completions` |
| Members | dashboard + completions |

## 프로덕션 전 체크리스트

- [ ] dev-nav 제거 후 React Router 연결
- [x] `/join/:inviteToken` URL 직접 진입 지원
- [ ] 401 응답 시 자동 로그아웃 처리
