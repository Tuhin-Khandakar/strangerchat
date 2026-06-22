import { useState, useEffect } from 'react'

export function useLiveCount() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/stats')
        .then((r) => r.json())
        .then((d) => { if (d && d.online != null) setCount(d.online) })
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return count
}
