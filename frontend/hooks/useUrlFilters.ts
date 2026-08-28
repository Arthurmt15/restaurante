import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

type UrlFilters = Record<string, string>

export function useUrlFilters(defaults: UrlFilters = {}): [UrlFilters, (key: string, value: string) => void] {
  const router = useRouter()
  const [filters, setFilters] = useState<UrlFilters>(defaults)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial: UrlFilters = {}
    for (const key of Object.keys(defaults)) {
      initial[key] = params.get(key) || defaults[key]
    }
    setFilters(initial)
  }, [router.isReady])

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      const params = new URLSearchParams(window.location.search)
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.replace({ pathname: router.pathname, query: qs ? Object.fromEntries(params) : undefined }, undefined, { shallow: true })
      return next
    })
  }, [router])

  return [filters, setFilter]
}
