import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { putCompletion, deleteCompletion } from '../lib/api'

/**
 * 퀘스트 완료 토글 훅 (낙관적 업데이트)
 * initialCompletions : Completion[]  (todayCompletions from dashboard)
 */
export function useCompletion(roomId, date, initialCompletions, currentMemberId) {
  const queryClient = useQueryClient()

  function buildCompletedSet(completions, memberId) {
    const mine = (completions ?? []).filter(c => c.memberId === memberId)
    return new Set(mine.map(c => c.questId))
  }

  // Set<questId> — 현재 멤버가 오늘 완료한 퀘스트 ID
  const [completedIds, setCompletedIds] = useState(() => {
    const mine = (initialCompletions ?? []).filter(c => c.memberId === currentMemberId)
    return new Set(mine.map(c => c.questId))
  })

  useEffect(() => {
    setCompletedIds(buildCompletedSet(initialCompletions, currentMemberId))
  }, [initialCompletions, currentMemberId, date])

  const toggle = useCallback(async (questId) => {
    const wasChecked = completedIds.has(questId)

    // 낙관적 업데이트
    setCompletedIds(prev => {
      const next = new Set(prev)
      wasChecked ? next.delete(questId) : next.add(questId)
      return next
    })

    try {
      if (wasChecked) {
        await deleteCompletion(roomId, questId, date)
      } else {
        await putCompletion(roomId, questId, date)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roomDashboard', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['dailyRoomStatus', roomId, date] }),
        queryClient.invalidateQueries({ queryKey: ['monthlyRoomStatus', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['monthlyCompletions', roomId] }),
      ])
    } catch (e) {
      // 실패 시 롤백
      setCompletedIds(prev => {
        const next = new Set(prev)
        wasChecked ? next.add(questId) : next.delete(questId)
        return next
      })
      console.error('completion toggle failed', e)
    }
  }, [roomId, date, completedIds, queryClient])

  return { completedIds, toggle }
}
