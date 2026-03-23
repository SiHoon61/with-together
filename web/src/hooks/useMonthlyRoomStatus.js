import { useQuery } from '@tanstack/react-query'
import { monthlyRoomStatusQueryOptions } from '../lib/queryOptions'

export function useMonthlyRoomStatus(roomId, year, month, todayStr) {
  const query = useQuery(monthlyRoomStatusQueryOptions(roomId, year, month, todayStr))
  const items = query.data ?? []

  const dayStatusMap = {}
  for (const item of items) {
    const statuses = item.memberStatuses.map((memberStatus) => memberStatus.status)

    if (statuses.length === 0 || statuses.every((status) => status === 'under_target')) {
      dayStatusMap[item.date] = 'none'
    } else if (statuses.some((status) => status === 'under_target')) {
      dayStatusMap[item.date] = 'partial'
    } else {
      dayStatusMap[item.date] = 'full'
    }
  }

  return {
    items,
    loading: query.isPending && !query.data,
    error: query.error ?? null,
    dayStatusMap,
    isFetching: query.isFetching,
  }
}
