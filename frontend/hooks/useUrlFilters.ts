import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

/** Tipo para armazenar filtros como pares chave-valor */
type UrlFilters = Record<string, string>

/**
 * Hook personalizado para sincronizar filtros de busca com a URL.
 * Permite que filtros (ex: status, período) sejam compartilhados via URL
 * e preservados ao navegar entre páginas.
 * 
 * @param defaults - Valores padrão para cada filtro
 * @returns Tupla com [filtrosAtivos, funçãoParaAlterarFiltro]
 * 
 * @example
 * const [filters, setFilter] = useUrlFilters({ status: '' })
 * setFilter('status', 'ABERTA') // Atualiza URL e estado
 */
export function useUrlFilters(defaults: UrlFilters = {}): [UrlFilters, (key: string, value: string) => void] {
  const router = useRouter()
  const [filters, setFilters] = useState<UrlFilters>(defaults)

  /** Inicializa filtros a partir dos query params da URL quando o router está pronto */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial: UrlFilters = {}
    for (const key of Object.keys(defaults)) {
      initial[key] = params.get(key) || defaults[key]
    }
    setFilters(initial)
  }, [router.isReady])

  /**
   * Atualiza um filtro específico e sincroniza com a URL.
   * @param key - Nome do filtro (ex: 'status')
   * @param value - Novo valor do filtro (vazio remove o filtro da URL)
   */
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
