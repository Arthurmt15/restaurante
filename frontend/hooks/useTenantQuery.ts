import { useState, useEffect, useCallback, DependencyList } from 'react'
import { apiGet } from '../lib/api'

/**
 * Hook genérico para busca de dados no padrão do projeto.
 * Encapsula o padrão de loading/error/data com recarga automática.
 *
 * @param endpoint - Caminho da API relativo (ex: '/comandas?status=ABERTA')
 * @param deps - Lista de dependências que dispara re-busca ao mudar
 * @returns Objeto com data, loading, error e função recarregar
 *
 * @example
 * const { data, loading, error, recarregar } = useTenantQuery<Mesa[]>('/mesas')
 */
export function useTenantQuery<T>(endpoint: string, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resultado = await apiGet<T>(endpoint)
      setData(resultado)
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(mensagem)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, ...deps])

  return { data, loading, error, recarregar: buscar }
}
