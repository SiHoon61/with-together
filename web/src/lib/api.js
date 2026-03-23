/**
 * API client — openapi-typescript 스키마 기반
 * BASE_URL은 환경변수 VITE_API_BASE_URL 로 주입, 없으면 same-origin 으로 호출한다.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const ROOM_ACCESS_KEY = 'qr_room_access_map'
const LAST_ROOM_KEY = 'qr_last_room_id'

export function getRoomAccessMap() {
  try {
    const raw = localStorage.getItem(ROOM_ACCESS_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function replaceRoomAccessMap(accessMap) {
  localStorage.setItem(ROOM_ACCESS_KEY, JSON.stringify(accessMap ?? {}))
}

export function getRoomAccess(roomId) {
  if (!roomId) return null
  const accessMap = getRoomAccessMap()
  return accessMap[roomId] ?? null
}

export function saveRoomAccess(roomId, access) {
  const nextMap = {
    ...getRoomAccessMap(),
    [roomId]: access,
  }
  replaceRoomAccessMap(nextMap)
}

export function clearRoomAccess(roomId) {
  const nextMap = { ...getRoomAccessMap() }
  delete nextMap[roomId]
  replaceRoomAccessMap(nextMap)
}

export function getLastRoomId() {
  return localStorage.getItem(LAST_ROOM_KEY) ?? null
}

export function setLastRoomId(roomId) {
  if (!roomId) {
    localStorage.removeItem(LAST_ROOM_KEY)
    return
  }
  localStorage.setItem(LAST_ROOM_KEY, roomId)
}

export function getSessionToken(roomId) {
  return getRoomAccess(roomId)?.sessionToken ?? null
}

export function getMemberId(roomId) {
  return getRoomAccess(roomId)?.memberId ?? null
}

function extractRoomIdFromPath(path) {
  const match = path.match(/^\/v1\/rooms\/([^/?]+)/)
  return match?.[1] ?? null
}

async function request(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = options.token ?? getSessionToken(options.roomId ?? extractRoomIdFromPath(path))
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const json = isJson ? await res.json() : null
  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `HTTP ${res.status}`)
    err.code = json?.error?.code
    err.status = res.status
    throw err
  }
  return json.data
}

const get = (path, options) => request('GET', path, undefined, options)
const post = (path, body, options) => request('POST', path, body, options)
const put = (path, body, options) => request('PUT', path, body ?? {}, options)
const patch = (path, body, options) => request('PATCH', path, body, options)
const del = (path, options) => request('DELETE', path, undefined, options)

/** GET /v1/rooms → RoomListData */
export function listRooms() {
  return get('/v1/rooms')
}

/** POST /v1/rooms → CreateRoomData */
export function createRoom({ roomName, leaderNickname, finalGoal, finalGoalDate, timezone }) {
  return post('/v1/rooms', { roomName, leaderNickname, finalGoal, finalGoalDate, timezone })
}

/** GET /v1/invites/{inviteToken} → InviteSummaryData */
export function getInviteSummary(inviteToken) {
  return get(`/v1/invites/${inviteToken}`)
}

/** POST /v1/invites/{inviteToken}/members → JoinInviteMemberData */
export function joinRoom(inviteToken, nickname) {
  return post(`/v1/invites/${inviteToken}/members`, { nickname })
}

/** GET /v1/rooms/{roomId} → RoomDashboardData */
export function getRoomDashboard(roomId) {
  return get(`/v1/rooms/${roomId}`, { roomId })
}

/** PATCH /v1/rooms/{roomId} → RoomData */
export function updateRoom(roomId, payload) {
  return patch(`/v1/rooms/${roomId}`, payload, { roomId })
}

/** DELETE /v1/rooms/{roomId}/members/{memberId} → null */
export function kickRoomMember(roomId, memberId) {
  return del(`/v1/rooms/${roomId}/members/${memberId}`, { roomId })
}

/** GET /v1/rooms/{roomId}/recurring-quests → RecurringQuestListData */
export function listRecurringQuests(roomId) {
  return get(`/v1/rooms/${roomId}/recurring-quests`, { roomId })
}

/** POST /v1/rooms/{roomId}/recurring-quests → RecurringQuestData */
export function createRecurringQuest(roomId, { title, description, sortOrder }) {
  return post(`/v1/rooms/${roomId}/recurring-quests`, {
    title,
    description,
    ...(sortOrder !== undefined ? { sortOrder } : {}),
  }, { roomId })
}

/** GET /v1/rooms/{roomId}/daily-status/{date} → RoomDailyStatusData */
export function getRoomDailyStatus(roomId, date) {
  return get(`/v1/rooms/${roomId}/daily-status/${date}`, { roomId })
}

/** PUT /v1/rooms/{roomId}/recurring-quests/{questId}/completions/{date} → CompletionData */
export function putCompletion(roomId, questId, date, note = null) {
  return put(
    `/v1/rooms/${roomId}/recurring-quests/${questId}/completions/${date}`,
    note ? { note } : {},
    { roomId }
  )
}

/** DELETE /v1/rooms/{roomId}/recurring-quests/{questId}/completions/{date} → null */
export function deleteCompletion(roomId, questId, date) {
  return del(`/v1/rooms/${roomId}/recurring-quests/${questId}/completions/${date}`, { roomId })
}

/** GET /v1/rooms/{roomId}/completions?from=&to= → CompletionListData */
export function listCompletions(roomId, from, to, { questId, memberId } = {}) {
  const params = new URLSearchParams({ from, to })
  if (questId) params.set('questId', questId)
  if (memberId) params.set('memberId', memberId)
  return get(`/v1/rooms/${roomId}/completions?${params}`, { roomId })
}

/** POST /v1/rooms/{roomId}/invite-token:rotate → RotateInviteTokenData */
export function rotateInviteToken(roomId) {
  return post(`/v1/rooms/${roomId}/invite-token:rotate`, undefined, { roomId })
}
