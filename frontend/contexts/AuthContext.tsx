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

/** URL base da API backend */
const API = process.env.NEXT_PUBLIC_API_URL || '/api'

// ─── Rotas que não precisam de autenticação ───────────────────────────────────
/** Rotas públicas que não exigem login */
const PUBLIC_ROUTES = ['/login']

// ─── Contexto de autenticação ─────────────────────────────────────────────────

/** Interface que define o valor do contexto de autenticação */
interface AuthContextValue {
  /** Dados do usuário logado ou null se não autenticado */
  usuario: Usuario | null
  /** true enquanto verifica se há sessão ativa */
  loading: boolean
  /** Função para autenticar com email/senha */
  login: (email: string, senha: string) => Promise<void>
  /** Função para encerrar a sessão */
  logout: () => Promise<void>
  /** Função para renovar o access token via refresh token */
  refreshToken: () => Promise<boolean>
}

/** Contexto React para compartilhar estado de autenticação */
const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provider de autenticação que gerencia o ciclo de vida da sessão.
 * Verifica tokens, renova sessões, e protege rotas autenticadas.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Tenta renovar o access token usando o refresh token (cookie HTTP-Only).
   * Chamado quando o token atual expira (401/TOKEN_EXPIRED).
   * @returns true se o refresh foi bem-sucedido
   */
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

  /**
   * Busca os dados do usuário logado com o access token atual.
   * Se o token estiver expirado, tenta renovar automaticamente.
   * @returns true se o usuário foi autenticado com sucesso
   */
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

  /**
   * Inicialização: verifica se há sessão ativa ao carregar a página.
   * Fluxo: token em memória → refresh token → redirecionamento se necessário.
   */
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      const isPublic = PUBLIC_ROUTES.includes(router.pathname)
      const tokenEmMemoria = getAccessToken()

      // Primeiro tenta com token em memória
      let ok = await fetchMe()

      if (!ok) {
        // Em rota pública sem token, não vale esperar o refresh:
        // mostra a página imediatamente (ex: /login não precisa aguardar)
        if (isPublic && !tokenEmMemoria) {
          setLoading(false)
          return
        }

        // Em rota protegida (ou se havia token expirado), tenta renovar via cookie
        const renewed = await refreshToken()
        if (renewed) ok = await fetchMe()
      }

      setLoading(false)

      // Redirect para login se rota protegida e não autenticado
      if (!ok && !isPublic) {
        router.replace('/login')
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Guard de rota: redireciona usuários não autenticados para /login.
   * Garçons só podem acessar rotas específicas (/comandas, /garcom/*).
   */
  useEffect(() => {
    if (loading) return

    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (!usuario && !isPublic) {
      router.replace('/login')
      return
    }

    if (usuario?.role === 'GARCOM' && !isPublic) {
      const allowed = ['/comandas', '/garcom/relatorio', '/garcom/dashboard']
      // Permite rotas filhas, ex: /comandas/nova
      const isAllowed = allowed.some(route => router.pathname === route || router.pathname.startsWith(route + '/'))
      if (!isAllowed) {
        router.replace('/comandas')
      }
    }
  }, [router.pathname, usuario, loading, router])

  /**
   * Realiza o login do usuário.
   * Envia credenciais para a API, recebe access token e dados do usuário.
   * @param email - Email ou nome de usuário
   * @param senha - Senha do usuário
   * @throws Error se as credenciais forem inválidas
   */
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

  /**
   * Realiza o logout do usuário.
   * Invalida o refresh token no servidor e limpa tokens locais.
   */
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

/**
 * Hook para acessar o contexto de autenticação.
 * Deve ser usado dentro de <AuthProvider>.
 * @returns Dados e funções de autenticação
 * @throws Error se usado fora de <AuthProvider>
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
