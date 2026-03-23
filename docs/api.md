# 퀘스트 방 MVP API 문서

> 이 문서는 초기 설계 메모용이다.
> 실제 단일 진실의 원천은 [api-spec/openapi.yaml](/Users/imsihun/Documents/Playground/api-spec/openapi.yaml) 이다.

## 개요

- 기본 경로: `/v1`
- 데이터 형식: `application/json`
- 인증 방식: `Authorization: Bearer <sessionToken>`
- 시간 형식: ISO 8601 UTC, 예시 `2026-03-20T08:30:00Z`
- 날짜 형식: `YYYY-MM-DD`, 예시 `2026-03-20`

이 API는 회원가입 없이 사용하는 방 기반 서비스 기준으로 설계한다.

- 메인 화면에서는 전체 방 목록을 조회해 보여줄 수 있다.
- 리더가 방을 생성한다.
- 리더가 비공개 초대 링크를 멤버에게 공유한다.
- 멤버는 별명을 입력해 최초 참가한다.
- 서버는 현재 브라우저용 `sessionToken`을 발급한다.

## 핵심 개념

### 방(Room)

공동 목표를 수행하는 협업 공간이다.

- `name`
- `finalGoal`
- `finalGoalDate`
- `dailyGoalCutoffPercent`
- `inviteToken`
- 리더 1명
- 멤버 여러 명
- 반복 퀘스트 여러 개

리더가 지정한 `finalGoalDate`까지 모든 멤버가 함께 달린다.
반복 퀘스트는 그 최종 목표를 향해 매일 수행하는 습관/행동 단위다.
또한 방은 `dailyGoalCutoffPercent`를 가지며, 멤버가 하루에 몇 퍼센트 이상 반복 퀘스트를 완료해야
그날의 목표를 달성한 것으로 볼지 결정한다.

### 멤버(Member)

방에 속한 참가자다.

- `role`: `leader` 또는 `member`
- `nickname`: 방 내부에서 유일해야 하는 별명
- 리더는 일반 멤버를 강퇴할 수 있다
- 리더 자신은 강퇴할 수 없다

### 세션(Session)

브라우저 단위 접근 토큰이다.

- 방 생성 시 발급
- 최초 참가 시 발급
- 프론트엔드는 bearer token으로 서버에 전달한다
- 프론트엔드는 `localStorage`에 저장한다
- 기본 만료 시간은 1년이다
- 서로 다른 브라우저는 서로 다른 세션 토큰을 가질 수 있다
- 세션 토큰은 방별로 발급되며, 프론트는 `roomId` 기준으로 별도 저장한다

### 반복 퀘스트(Recurring Quest)

리더가 생성하는 방의 일일 반복 목표다.

- 방당 여러 개를 가질 수 있다
- 생성/수정은 리더만 가능
- 멤버는 퀘스트별, 날짜별로 수행 여부를 체크한다
- 날짜마다 퀘스트 자체를 새로 만드는 구조가 아니다

### 완료 기록(Completion)

멤버가 특정 반복 퀘스트를 특정 날짜에 완료했는지 나타내는 기록이다.

- `questId` 기준으로 반복 퀘스트에 연결된다
- `memberId + questId + date` 조합은 유일해야 한다

### 일일 목표 상태(Daily Goal Status)

멤버의 특정 날짜 상태는 `그날 완료한 활성 반복 퀘스트 비율`로 계산한다.

- `under_target`: 완료 비율이 `dailyGoalCutoffPercent` 미만
- `goal_met`: 완료 비율이 `dailyGoalCutoffPercent` 이상이고 100% 미만
- `perfect`: 활성 반복 퀘스트를 100% 완료

커트라인 계산 규칙:

- 필요한 최소 완료 개수는 `활성 반복 퀘스트 개수 × dailyGoalCutoffPercent / 100` 값을 반올림해서 계산한다
- 예: 반복 퀘스트 3개, 커트라인 50%라면 `3 × 0.5 = 1.5` 이고 반올림하여 `2개 이상 완료` 시 `goal_met` 이다

예를 들어 방의 반복 퀘스트가 10개이고 `dailyGoalCutoffPercent = 50` 이면:

- 4개 완료: `under_target`
- 5개 완료: `goal_met`
- 10개 완료: `perfect`

반복 퀘스트가 3개이고 `dailyGoalCutoffPercent = 50` 이면:

- 1개 완료: `under_target`
- 2개 완료: `goal_met`
- 3개 완료: `perfect`

기본 커트라인은 50%이며, 리더만 수정할 수 있다.

## 리소스 형태

### Room

```json
{
  "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
  "name": "100일 운동방",
  "finalGoal": "100일 동안 매일 운동 인증하기",
  "finalGoalDate": "2026-06-30",
  "dailyGoalCutoffPercent": 50,
  "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
  "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
  "memberCount": 4,
  "createdAt": "2026-03-20T08:30:00Z",
  "updatedAt": "2026-03-20T08:30:00Z"
}
```

### Member

```json
{
  "id": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
  "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
  "nickname": "시훈",
  "role": "leader",
  "joinedAt": "2026-03-20T08:30:00Z"
}
```

### Session

```json
{
  "sessionToken": "ses_6kJHf6P0g7hJ6KXvR3q2M1wL9a",
  "issuedAt": "2026-03-20T08:30:00Z"
}
```

### Recurring Quest

```json
{
  "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
  "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
  "title": "물 2리터 마시기",
  "description": "하루 동안 물 2리터 이상 마시고 체크하기",
  "isActive": true,
  "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
  "createdAt": "2026-03-20T08:31:00Z",
  "updatedAt": "2026-03-20T08:31:00Z"
}
```

### Completion

```json
{
  "questId": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
  "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
  "date": "2026-03-20",
  "memberId": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
  "completedAt": "2026-03-20T12:10:00Z"
}
```

## 에러 응답 형식

모든 2xx 이외 응답은 아래 형식을 사용한다.

```json
{
  "error": {
    "code": "nickname_taken",
    "message": "That nickname is already used in this room."
  }
}
```

권장 에러 코드:

- `invalid_request`
- `unauthorized`
- `forbidden`
- `room_not_found`
- `invite_not_found`
- `member_not_found`
- `nickname_taken`
- `recurring_quest_not_found`
- `completion_not_found`
- `cannot_kick_leader`
- `cannot_kick_self`
- `conflict`

## 인증 규칙

### Bearer 세션 토큰

보호된 방 관련 API에 필요하다.

예시:

```http
Authorization: Bearer ses_6kJHf6P0g7hJ6KXvR3q2M1wL9a
```

세션 정책:

- 세션 토큰은 브라우저 단위로 발급한다
- 세션 토큰 만료 시간은 발급 시점 기준 1년이다
- 프론트엔드는 세션 토큰을 `localStorage`에 저장한다
- 프론트는 방마다 `roomId -> { sessionToken, memberId }` 형태로 관리하는 것을 권장한다

## 엔드포인트

## 0. 방 목록 조회

로그인하지 않은 메인 화면에서 전체 방 목록을 보여줄 때 사용한다.

`GET /v1/rooms`

### 응답 `200 OK`

```json
{
  "data": {
    "rooms": [
      {
        "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "name": "100일 운동방",
        "finalGoal": "100일 동안 매일 운동 인증하기",
        "finalGoalDate": "2026-06-30",
        "dailyGoalCutoffPercent": 50,
        "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
        "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "memberCount": 4,
        "createdAt": "2026-03-20T08:30:00Z",
        "updatedAt": "2026-03-20T08:30:00Z"
      }
    ]
  }
}
```

### 비고

- 최신 생성 순으로 정렬한다
- 각 방 카드를 클릭하면 프론트는 `/join/{inviteToken}` 으로 이동할 수 있다

## 1. 방 생성

방과 첫 번째 리더 멤버를 한 번에 생성한다.

`POST /v1/rooms`

### 요청

```json
{
  "roomName": "100일 운동방",
  "leaderNickname": "시훈",
  "finalGoal": "100일 동안 매일 운동 인증하기",
  "finalGoalDate": "2026-06-30",
  "timezone": "Asia/Seoul"
}
```

### 응답 `201 Created`

```json
{
  "data": {
    "room": {
      "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "name": "100일 운동방",
      "finalGoal": "100일 동안 매일 운동 인증하기",
      "finalGoalDate": "2026-06-30",
      "dailyGoalCutoffPercent": 50,
      "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
      "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "memberCount": 1,
      "createdAt": "2026-03-20T08:30:00Z",
      "updatedAt": "2026-03-20T08:30:00Z"
    },
    "member": {
      "id": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "nickname": "시훈",
      "role": "leader",
      "joinedAt": "2026-03-20T08:30:00Z"
    },
    "session": {
      "sessionToken": "ses_6kJHf6P0g7hJ6KXvR3q2M1wL9a",
      "issuedAt": "2026-03-20T08:30:00Z"
    },
    "inviteUrl": "https://app.example.com/join/ivt_0sUQGqPH9k6f0QGmYk8y"
  }
}
```

### 비고

- `finalGoalDate`는 방의 마감 날짜다.
- `dailyGoalCutoffPercent`의 기본값은 50이다.
- 방의 진행률, 남은 일수, 종료 여부는 방의 `timezone`과 `finalGoalDate`를 기준으로 계산하는 것을 권장한다.

## 2. 초대 링크 정보 조회

공유된 초대 링크로 진입했을 때 보여줄 방 요약 정보를 조회한다.

`GET /v1/invites/{inviteToken}`

### 응답 `200 OK`

```json
{
  "data": {
    "room": {
      "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "name": "100일 운동방",
      "finalGoal": "100일 동안 매일 운동 인증하기",
      "finalGoalDate": "2026-06-30",
      "dailyGoalCutoffPercent": 50,
      "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
      "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "memberCount": 4,
      "createdAt": "2026-03-20T08:30:00Z",
      "updatedAt": "2026-03-20T09:10:00Z"
    },
    "recurringQuests": [
      {
        "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "물 2리터 마시기",
        "description": "하루 동안 물 2리터 이상 마시고 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:31:00Z",
        "updatedAt": "2026-03-20T08:31:00Z"
      },
      {
        "id": "quest_01HQ6BA3M6Q8X9M4V1P7R2Y5ZN",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "만 보 걷기",
        "description": "매일 만 보 이상 걷고 완료 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:35:00Z",
        "updatedAt": "2026-03-20T08:35:00Z"
      }
    ]
  }
}
```

### 비고

- 이 엔드포인트는 초대 링크를 가진 누구나 호출할 수 있다.

## 3. 초대 링크로 최초 참가

초대 토큰이 가리키는 방에 새로운 멤버를 생성한다.

`POST /v1/invites/{inviteToken}/members`

### 요청

```json
{
  "nickname": "민지"
}
```

### 응답 `201 Created`

```json
{
  "data": {
    "room": {
      "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "name": "100일 운동방",
      "finalGoal": "100일 동안 매일 운동 인증하기",
      "finalGoalDate": "2026-06-30",
      "dailyGoalCutoffPercent": 50,
      "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
      "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "memberCount": 5,
      "createdAt": "2026-03-20T08:30:00Z",
      "updatedAt": "2026-03-20T09:12:00Z"
    },
    "member": {
      "id": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "nickname": "민지",
      "role": "member",
      "joinedAt": "2026-03-20T09:12:00Z"
    },
    "session": {
      "sessionToken": "ses_4wPkT0nWq6mJc7XQ7Da1sVb9",
      "issuedAt": "2026-03-20T09:12:00Z"
    }
  }
}
```

### 검증 규칙

- `nickname`은 필수다
- `nickname`은 방 내부에서 유일해야 한다
- 권장 최대 길이: 24자

## 4. 방 대시보드 조회

현재 인증된 멤버 기준으로 방 정보를 조회한다.

`GET /v1/rooms/{roomId}`

### 인증

- 필요

### 응답 `200 OK`

```json
{
  "data": {
    "room": {
      "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "name": "100일 운동방",
      "finalGoal": "100일 동안 매일 운동 인증하기",
      "finalGoalDate": "2026-06-30",
      "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
      "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "memberCount": 5,
      "createdAt": "2026-03-20T08:30:00Z",
      "updatedAt": "2026-03-20T09:12:00Z"
    },
    "currentMember": {
      "id": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "nickname": "민지",
      "role": "member",
      "joinedAt": "2026-03-20T09:12:00Z"
    },
    "members": [
      {
        "id": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "nickname": "시훈",
        "role": "leader",
        "joinedAt": "2026-03-20T08:30:00Z"
      },
      {
        "id": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "nickname": "민지",
        "role": "member",
        "joinedAt": "2026-03-20T09:12:00Z"
      }
    ],
    "recurringQuests": [
      {
        "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "물 2리터 마시기",
        "description": "하루 동안 물 2리터 이상 마시고 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:31:00Z",
        "updatedAt": "2026-03-20T08:31:00Z"
      },
      {
        "id": "quest_01HQ6BA3M6Q8X9M4V1P7R2Y5ZN",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "만 보 걷기",
        "description": "매일 만 보 이상 걷고 완료 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:35:00Z",
        "updatedAt": "2026-03-20T08:35:00Z"
      }
    ],
    "todayCompletions": [
      {
        "questId": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "date": "2026-03-20",
        "memberId": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
        "completedAt": "2026-03-20T12:10:00Z"
      }
    ]
  }
}
```

## 5. 방 이름/최종 목표/최종 목표 날짜/일일 목표 커트라인 수정

리더만 방 이름, 최종 목표, 최종 목표 날짜, 일일 목표 커트라인 퍼센트를 수정할 수 있다.

`PATCH /v1/rooms/{roomId}`

### 인증

- 필요
- 리더만 가능

### 요청

```json
{
  "roomName": "100일 홈트방",
  "finalGoal": "100일 동안 매일 홈트 인증하기",
  "finalGoalDate": "2026-07-31",
  "dailyGoalCutoffPercent": 60
}
```

### 응답 `200 OK`

```json
{
  "data": {
    "room": {
      "id": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "name": "100일 홈트방",
      "finalGoal": "100일 동안 매일 홈트 인증하기",
      "finalGoalDate": "2026-07-31",
      "dailyGoalCutoffPercent": 60,
      "inviteToken": "ivt_0sUQGqPH9k6f0QGmYk8y",
      "leaderMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "memberCount": 5,
      "createdAt": "2026-03-20T08:30:00Z",
      "updatedAt": "2026-03-20T09:30:00Z"
    }
  }
}
```

## 6. 반복 퀘스트 생성

## 5-1. 멤버 강퇴

리더가 방의 일반 멤버를 강퇴한다.

`DELETE /v1/rooms/{roomId}/members/{memberId}`

### 인증

- 필요
- 리더만 가능

### 응답 `204 No Content`

응답 바디 없음.

### 비고

- 리더는 일반 멤버만 강퇴할 수 있다
- 리더 자신은 강퇴할 수 없다
- 강퇴된 멤버의 세션은 함께 무효화된다
- 강퇴된 멤버의 완료 기록은 함께 삭제된다

## 6. 반복 퀘스트 생성

리더가 방에 새로운 반복 퀘스트를 생성한다.

`POST /v1/rooms/{roomId}/recurring-quests`

### 인증

- 필요
- 리더만 가능

### 요청

```json
{
  "title": "물 2리터 마시기",
  "description": "하루 동안 물 2리터 이상 마시고 체크하기"
}
```

### 응답 `201 Created`

```json
{
  "data": {
    "recurringQuest": {
      "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "title": "물 2리터 마시기",
      "description": "하루 동안 물 2리터 이상 마시고 체크하기",
      "isActive": true,
      "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "createdAt": "2026-03-20T08:31:00Z",
      "updatedAt": "2026-03-20T08:31:00Z"
    }
  }
}
```

## 7. 반복 퀘스트 목록 조회

현재 방에 설정된 반복 퀘스트 목록을 조회한다.

`GET /v1/rooms/{roomId}/recurring-quests`

### 인증

- 필요

### 응답 `200 OK`

```json
{
  "data": {
    "items": [
      {
        "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "물 2리터 마시기",
        "description": "하루 동안 물 2리터 이상 마시고 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:31:00Z",
        "updatedAt": "2026-03-20T08:31:00Z"
      },
      {
        "id": "quest_01HQ6BA3M6Q8X9M4V1P7R2Y5ZN",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "title": "만 보 걷기",
        "description": "매일 만 보 이상 걷고 완료 체크하기",
        "isActive": true,
        "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
        "createdAt": "2026-03-20T08:35:00Z",
        "updatedAt": "2026-03-20T08:35:00Z"
      }
    ]
  }
}
```

## 8. 반복 퀘스트 수정

리더가 특정 반복 퀘스트를 수정한다.

`PATCH /v1/rooms/{roomId}/recurring-quests/{questId}`

### 인증

- 필요
- 리더만 가능

### 요청

```json
{
  "title": "물 2.5리터 마시기",
  "description": "하루 동안 물 2.5리터 이상 마시고 체크하기",
  "isActive": true
}
```

### 응답 `200 OK`

```json
{
  "data": {
    "recurringQuest": {
      "id": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "title": "물 2.5리터 마시기",
      "description": "하루 동안 물 2.5리터 이상 마시고 체크하기",
      "isActive": true,
      "createdByMemberId": "mem_01HQ6A9G9D22N17H2N3QH7S1BG",
      "createdAt": "2026-03-20T08:31:00Z",
      "updatedAt": "2026-03-21T09:00:00Z"
    }
  }
}
```

## 9. 날짜별 수행 기록 조회

히스토리 화면이나 캘린더 화면에서 사용한다.

`GET /v1/rooms/{roomId}/completions?from=2026-03-01&to=2026-03-31`

### 인증

- 필요

### 응답 `200 OK`

```json
{
  "data": {
    "items": [
      {
        "questId": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "date": "2026-03-20",
        "memberId": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
        "completedAt": "2026-03-20T12:10:00Z"
      },
      {
        "questId": "quest_01HQ6BA3M6Q8X9M4V1P7R2Y5ZN",
        "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
        "date": "2026-03-20",
        "memberId": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
        "completedAt": "2026-03-20T12:40:00Z"
      }
    ]
  }
}
```

## 10. 내 일일 퀘스트 완료 처리

현재 인증된 멤버 기준으로 특정 반복 퀘스트의 해당 날짜 완료를 기록한다.

`PUT /v1/rooms/{roomId}/recurring-quests/{questId}/completions/{date}`

### 인증

- 필요

### 요청

```json
{}
```

### 응답 `200 OK`

```json
{
  "data": {
    "completion": {
      "questId": "quest_01HQ6B8YJ0P8R6QK2F6N1H7C4M",
      "roomId": "room_01HQ6A7J4X2JTKD5Z6Y9M8Q2F4",
      "date": "2026-03-20",
      "memberId": "mem_01HQ6AB5G4Y6M39RX8X9F3Q4QF",
      "completedAt": "2026-03-20T12:10:00Z"
    }
  }
}
```

## 11. 내 완료 기록 취소

현재 인증된 멤버가 자신의 완료 기록을 취소한다.

`DELETE /v1/rooms/{roomId}/recurring-quests/{questId}/completions/{date}`

### 인증

- 필요

### 응답 `204 No Content`

응답 바디 없음.

## 12. 초대 링크 재발급

리더가 기존 초대 토큰을 무효화하고 새 초대 링크를 발급한다.

`POST /v1/rooms/{roomId}/invite-token:rotate`

### 인증

- 필요
- 리더만 가능

### 응답 `200 OK`

```json
{
  "data": {
    "inviteToken": "ivt_6bK6pA1mQd3VxK2rC9sW",
    "inviteUrl": "https://app.example.com/join/ivt_6bK6pA1mQd3VxK2rC9sW"
  }
}
```

## 권장 프론트 흐름

### 방 생성

1. `POST /v1/rooms`
2. `session.sessionToken` 저장
3. `finalGoalDate` 기준 남은 기간을 함께 안내
4. 방 대시보드로 이동

### 멤버 최초 참가

1. `GET /v1/invites/{inviteToken}`
2. `POST /v1/invites/{inviteToken}/members`
3. `session.sessionToken` 저장
4. 방 대시보드로 이동

### 반복 퀘스트 완료

1. `GET /v1/rooms/{roomId}`
2. 사용자가 완료할 퀘스트 선택
3. `PUT /v1/rooms/{roomId}/recurring-quests/{questId}/completions/{date}`

## 구조 메모

이 MVP에서는 퀘스트와 수행 기록을 분리한다.

- 방은 `finalGoal`과 `finalGoalDate`를 가진다
- 방은 `dailyGoalCutoffPercent`를 가지며 기본값은 50이다
- 모든 멤버는 해당 날짜까지 같은 최종 목표를 향해 함께 달린다
- 리더는 방마다 여러 개의 `반복 퀘스트`를 설정할 수 있다
- 멤버는 퀘스트별로 매일 수행하고 날짜별 `completion`을 남긴다
- 즉, 매일 새로운 퀘스트 레코드를 만드는 구조가 아니라 같은 퀘스트들에 대해 날짜별 수행 기록이 누적되는 구조다
- 멤버의 그날 상태는 `under_target`, `goal_met`, `perfect` 중 하나로 계산할 수 있다

## 구현 전 확인할 질문

아래 항목은 구현 전에 정책을 확정하는 것이 좋다.

- 탈퇴하거나 삭제된 멤버의 닉네임을 다른 사람이 재사용할 수 있는가?
- 멤버가 나중에 닉네임을 변경할 수 있어야 하는가?
- 앞으로 리더를 여러 명 둘 가능성이 있는가?
- 이미 완료한 멤버가 있는 상태에서도 반복 퀘스트 수정이 가능한가?
- 반복 퀘스트를 삭제할지, 아니면 `isActive = false`로 비활성화만 할지?
