import { useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { putCompletion, deleteCompletion } from '../lib/api'

export function useCompletion(roomId, date, initialCompletions, currentMemberId) {
  const queryClient = useQueryClient()
  const [pendingQuestId, setPendingQuestId] = useState(null)

  const completedIds = useMemo(() => {
    const mine = (initialCompletions ?? []).filter((completion) => completion.memberId === currentMemberId)
    return new Set(mine.map(c => c.questId))
  }, [initialCompletions, currentMemberId])

  const toggle = useCallback(async (questId) => {
    if (pendingQuestId) return

    const wasChecked = completedIds.has(questId)

    try {
      setPendingQuestId(questId)
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
      console.error('completion toggle failed', e)
    } finally {
      setPendingQuestId(null)
    }
  }, [roomId, date, completedIds, pendingQuestId, queryClient])

  return { completedIds, toggle, pendingQuestId }
}
