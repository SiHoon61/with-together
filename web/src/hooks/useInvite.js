import { useState, useEffect } from 'react'
import { getInviteSummary, joinRoom } from '../lib/api'

export function useInviteSummary(inviteToken) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!inviteToken) return
    let cancelled = false
    getInviteSummary(inviteToken)
      .then(d  => { if (!cancelled) { setData(d);    setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e);   setLoading(false) } })
    return () => { cancelled = true }
  }, [inviteToken])

  return { data, loading, error }
}

export function useJoinRoom() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function join(inviteToken, nickname, onSuccess) {
    try {
      setLoading(true)
      setError(null)
      const d = await joinRoom(inviteToken, nickname)
      onSuccess(d)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return { join, loading, error }
}
