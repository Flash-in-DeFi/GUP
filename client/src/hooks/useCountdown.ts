import { useState, useEffect, useRef } from 'react'

function calcRemaining(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

export function useCountdown(expiresAt: string | null): number {
  const [seconds, setSeconds] = useState(() => expiresAt ? calcRemaining(expiresAt) : 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    if (!expiresAt) return

    intervalRef.current = setInterval(() => {
      const remaining = calcRemaining(expiresAt)
      setSeconds(remaining)
      if (remaining <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
      }
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [expiresAt])

  return seconds
}
