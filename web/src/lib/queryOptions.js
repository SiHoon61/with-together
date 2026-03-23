import { keepPreviousData } from '@tanstack/react-query'
import { getRoomDashboard, getRoomDailyStatus, listCompletions } from './api'
import { STALE_TIME_MS } from './queryClient'

export function dashboardQueryOptions(roomId) {
  return {
    queryKey: ['roomDashboard', roomId],
    queryFn: () => getRoomDashboard(roomId),
    enabled: Boolean(roomId),
    staleTime: STALE_TIME_MS,
  }
}

export function monthlyRoomStatusQueryOptions(roomId, year, month, todayStr) {
  const lastDay = new Date(year, month, 0).getDate()

  return {
    queryKey: ['monthlyRoomStatus', roomId, year, month, todayStr],
    queryFn: async () => {
      const dates = Array.from({ length: lastDay }, (_, index) =>
        `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
      )

      const visibleDates = todayStr
        ? dates.filter((date) => date <= todayStr)
        : dates

      const responses = await Promise.all(
        visibleDates.map(async (date) => {
          const data = await getRoomDailyStatus(roomId, date)
          return {
            date,
            memberStatuses: data.memberStatuses ?? [],
          }
        }),
      )

      return responses
    },
    enabled: Boolean(roomId),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  }
}

export function dailyRoomStatusQueryOptions(roomId, date) {
  return {
    queryKey: ['dailyRoomStatus', roomId, date],
    queryFn: () => getRoomDailyStatus(roomId, date),
    enabled: Boolean(roomId && date),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  }
}

export function monthlyCompletionsQueryOptions(roomId, year, month, memberId) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  return {
    queryKey: ['monthlyCompletions', roomId, year, month, memberId],
    queryFn: async () => {
      const data = await listCompletions(roomId, from, to, { memberId })
      return data.items ?? []
    },
    enabled: Boolean(roomId && memberId),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  }
}
