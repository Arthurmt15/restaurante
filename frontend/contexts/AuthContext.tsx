import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import {
  getAccessToken,
  setAccessToken,
  clearAllTokens,
  type Usuario,
} from '../lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

// ─── Rotas que não precisam de autenticação ───────────────────────────────────
const PUBLIC_ROUTES = ['/login']

// ─── Contexto de autenticação ─────────────────────────────────────────────────

interface AuthContextValue {
  usuario: Usuario | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  // Tenta renovar o access token usando o refresh token (cookie HTTP-Only)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // envia o cookie HTTP-Only
      })
      if (!res.ok) return false

      const { accessToken } = await res.json()
      setAccessToken(accessToken)
      return true
    } catch {
      return false
    }
  }, [])

  // Busca os dados do usuário logado com o access token atual
  const fetchMe = useCallback(async (): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })

      if (res.status === 401) {
        // Tentar renovar o token
        const renewed = await refreshToken()
        if (!renewed) return false

        // Retry com o novo token
        const newToken = getAccessToken()
        const retryRes = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${newToken}` },
          credentials: 'include',
        })
        if (!retryRes.ok) return false

        const data = await retryRes.json()
        setUsuario(data.usuario)
        return true
      }

      if (!res.ok) return false

      const data = await res.json()
      setUsuario(data.usuario)
      return true
    } catch {
      return false
    }
  }, [refreshToken])

  // Inicialização: verificar se há sessão ativa ao carregar a página
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      // Primeiro tenta com token em memória
      let ok = await fetchMe()

      // Se falhou, tenta renovar via refresh token (cookie)
      if (!ok) {
        const renewed = await refreshToken()
        if (renewed) ok = await fetchMe()
      }

      setLoading(false)

      // Redirect para login se rota protegida e não autenticado
      const isPublic = PUBLIC_ROUTES.includes(router.pathname)
      if (!ok && !isPublic) {
        router.replace('/login')
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guard de rota ao navegar
  useEffect(() => {
    if (loading) return

    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (!usuario && !isPublic) {
      router.replace('/login')
    }
  }, [router.pathname, usuario, loading, router])

  const login = useCallback(async (email: string, senha: string): Promise<void> => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // necessário para receber o cookie de refresh token
      body: JSON.stringify({ email, senha }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Credenciais inválidas')
    }

    const data = await res.json()
    setAccessToken(data.accessToken)
    setUsuario(data.usuario)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignora erros de rede no logout
    } finally {
      clearAllTokens()
      setUsuario(null)
      router.push('/login')
    }
  }, [router])

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook de acesso ───────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
