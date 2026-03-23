import { useQuery } from '@tanstack/react-query'
import { dashboardQueryOptions } from '../lib/queryOptions'

/**
 * GET /v1/rooms/{roomId} → RoomDashboardData
 * { room, todayDate, currentMember, members, recurringQuests, todayCompletions }
 */
export function useDashboard(roomId) {
  const query = useQuery(dashboardQueryOptions(roomId))

  return {
    data: query.data ?? null,
    loading: query.isPending && !query.data,
    error: query.error ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}
