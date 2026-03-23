import { useMemo, useRef } from 'react'

export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 } = {}) {
  const startRef = useRef(null)

  return useMemo(() => ({
    onTouchStart(event) {
      const touch = event.touches?.[0]
      if (!touch) return
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
    },
    onTouchEnd(event) {
      const start = startRef.current
      const touch = event.changedTouches?.[0]
      startRef.current = null
      if (!start || !touch) return

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      if (Math.abs(deltaX) < threshold) return
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return

      if (deltaX < 0) {
        onSwipeLeft?.()
        return
      }

      onSwipeRight?.()
    },
  }), [onSwipeLeft, onSwipeRight, threshold])
}
