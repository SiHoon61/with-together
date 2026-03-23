import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import {
  clearRoomAccess,
  getLastRoomId,
  getRoomAccess,
  getRoomAccessMap,
  replaceRoomAccessMap,
  saveRoomAccess,
  setLastRoomId,
} from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [roomAccessMap, setRoomAccessMap] = useState(() => getRoomAccessMap())
  const [lastRoomIdState, setLastRoomIdState] = useState(() => getLastRoomId())

  const login = useCallback(({ session, room, member }) => {
    const nextAccess = {
      sessionToken: session.sessionToken,
      memberId: member.id,
    }

    saveRoomAccess(room.id, nextAccess)
    setRoomAccessMap((prev) => ({
      ...prev,
      [room.id]: nextAccess,
    }))
    setLastRoomId(room.id)
    setLastRoomIdState(room.id)
  }, [])

  const logoutRoom = useCallback((roomId) => {
    clearRoomAccess(roomId)
    setRoomAccessMap((prev) => {
      const next = { ...prev }
      delete next[roomId]
      return next
    })

    const nextMap = getRoomAccessMap()
    const nextLastRoomId = nextMap[lastRoomIdState]
      ? lastRoomIdState
      : Object.keys(nextMap)[0] ?? null
    setLastRoomId(nextLastRoomId)
    setLastRoomIdState(nextLastRoomId)
  }, [lastRoomIdState])

  const importAccessBundle = useCallback((bundle) => {
    const normalizedRooms = bundle?.rooms ?? {}
    replaceRoomAccessMap(normalizedRooms)
    setRoomAccessMap(normalizedRooms)

    const nextLastRoomId = normalizedRooms[bundle?.lastRoomId]
      ? bundle.lastRoomId
      : Object.keys(normalizedRooms)[0] ?? null
    setLastRoomId(nextLastRoomId)
    setLastRoomIdState(nextLastRoomId)
    return nextLastRoomId
  }, [])

  const markRoomVisited = useCallback((roomId) => {
    if (!roomId) return
    setLastRoomId(roomId)
    setLastRoomIdState(roomId)
  }, [])

  const getAccess = useCallback((roomId) => {
    if (!roomId) return null
    return getRoomAccess(roomId)
  }, [])

  const exportAccessBundle = useCallback(() => ({
    version: 1,
    createdAt: new Date().toISOString(),
    lastRoomId: lastRoomIdState,
    rooms: getRoomAccessMap(),
  }), [lastRoomIdState])

  const value = useMemo(() => ({
    roomAccessMap,
    accessibleRoomIds: Object.keys(roomAccessMap),
    lastRoomId: lastRoomIdState,
    login,
    logoutRoom,
    importAccessBundle,
    exportAccessBundle,
    markRoomVisited,
    getRoomAccess: getAccess,
  }), [
    roomAccessMap,
    lastRoomIdState,
    login,
    logoutRoom,
    importAccessBundle,
    exportAccessBundle,
    markRoomVisited,
    getAccess,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
