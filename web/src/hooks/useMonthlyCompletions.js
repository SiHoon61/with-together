import { useQuery } from '@tanstack/react-query'
import { monthlyCompletionsQueryOptions } from '../lib/queryOptions'

/**
 * GET /v1/rooms/{roomId}/completions?from=&to=
 * memberId 로 필터해서 특정 달의 내 완료 기록을 가져온다.
 * returns dayStatusMap: { [date: string]: 'full' | 'partial' | 'none' }
 * + raw items[]
 */
function getRequiredCount(totalQuests, cutoffPercent) {
  if (totalQuests <= 0) return null
  return Math.max(1, Math.round((totalQuests * cutoffPercent) / 100))
}

export function useMonthlyCompletions(roomId, year, month, currentMemberId, totalQuests, cutoffPercent = 50) {
  const lastDay = new Date(year, month, 0).getDate()
  const query = useQuery(monthlyCompletionsQueryOptions(roomId, year, month, currentMemberId))
  const items = query.data ?? []

  // date → 완료 수 맵
  const countByDate = {}
  for (const c of items) {
    countByDate[c.date] = (countByDate[c.date] ?? 0) + 1
  }

  const requiredCount = getRequiredCount(totalQuests, cutoffPercent)

  // date → 'perfect' | 'goal_met' | 'under_target'
  const dayStatusMap = {}
  for (const [date, count] of Object.entries(countByDate)) {
    if (totalQuests > 0 && count >= totalQuests) dayStatusMap[date] = 'perfect'
    else if (requiredCount !== null && count >= requiredCount) dayStatusMap[date] = 'goal_met'
    else dayStatusMap[date] = 'under_target'
  }

  // 연속 달성일 계산 (오늘부터 역순)
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (dayStatusMap[key] === 'perfect' || dayStatusMap[key] === 'goal_met') streak++
    else break
  }

  const totalDone = Object.values(dayStatusMap)
    .filter(v => v === 'perfect' || v === 'goal_met')
    .length
  const daysInMonth2 = lastDay
  const achieveRate = Math.round((totalDone / daysInMonth2) * 100)

  return {
    items,
    loading: query.isPending && !query.data,
    error: query.error ?? null,
    dayStatusMap,
    streak,
    totalDone,
    achieveRate,
    isFetching: query.isFetching,
  }
}
