import { useState, useEffect, useRef } from 'react'

export function useCountdown(expiresAt: string | null): number {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!expiresAt) { setSeconds(0); return }

    function tick() {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt!).getTime() - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [expiresAt])

  return seconds
}
