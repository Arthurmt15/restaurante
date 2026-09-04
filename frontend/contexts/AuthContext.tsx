/**
 * Contexto de Autenticação do sistema.
 *
 * Este provider gerencia todo o ciclo de vida da autenticação:
 * - Verificação de sessão ativa (NextAuth + backend JWT)
 * - Renovação automática de tokens
 * - Proteção de rotas (redirecionamento para /login)
 * - Controle de acesso por role (GARCOM, CLIENTE, SUPERADMIN)
 *
 * Integra NextAuth.js (Google OAuth) com o JWT do backend.
 * A sessão do NextAuth fornece o accessToken do backend,
 * que é usado em todas as requisições à API.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import { useSession, signIn, signOut } from 'next-auth/react'
import {
  getAccessToken,
  setAccessToken,
  clearAllTokens,
  type Usuario,
} from '../lib/auth'

/** URL base da API backend */
const API = process.env.NEXT_PUBLIC_API_URL || '/api'

/**
 * Rotas públicas que não exigem autenticação.
 * Usuários não logados podem acessar sem redirecionamento.
 */
const PUBLIC_ROUTES = ['/login']

/**
 * Interface que define o valor do contexto de autenticação.
 * Fornece dados do usuário, estado de carregamento e funções de auth.
 */
interface AuthContextValue {
  /** Dados do usuário logado ou null se não autenticado */
  usuario: Usuario | null
  /** true enquanto verifica se há sessão ativa */
  loading: boolean
  /** Função para iniciar login via Google OAuth */
  login: () => Promise<void>
  /** Função para encerrar a sessão (NextAuth + backend) */
  logout: () => Promise<void>
  /** Função para renovar o access token via refresh token */
  refreshToken: () => Promise<boolean>
}

/** Contexto React para compartilhar estado de autenticação */
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Provider de autenticação que gerencia o ciclo de vida da sessão.
 *
 * Fluxo de inicialização:
 * 1. Verifica se há sessão NextAuth ativa
 * 2. Se sim, obtém o accessToken do backend da sessão
 * 3. Valida o token com o backend (/api/auth/me)
 * 4. Se inválido, tenta renovar via refresh token
 * 5. Se tudo falhar, redireciona para /login
 *
 * Fluxo de login:
 * 1. Chama signIn('google') do NextAuth
 * 2. NextAuth redireciona para Google OAuth
 * 3. Após autorização, callback signIn sincroniza com backend
 * 4. JWT do NextAuth armazena o accessToken do backend
 * 5. AuthContext detecta a sessão e carrega dados do usuário
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
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
        credentials: 'include',
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
   * Efeito que sincroniza a sessão NextAuth com o estado local.
   *
   * Quando a sessão do NextAuth muda (login/logout), este efeito:
   * - Se há sessão com accessToken: salva no sessionStorage e busca dados do usuário
   * - Se não há sessão: limpa tokens e estado do usuário
   * - Redireciona para /login se necessário
   */
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      const isPublic = PUBLIC_ROUTES.includes(router.pathname)

      // Se NextAuth está carregando, aguardar
      if (sessionStatus === 'loading') {
        return
      }

      // Se há sessão NextAuth com accessToken do backend
      if (sessionStatus === 'authenticated' && (session as any)?.accessToken) {
        const backendToken = (session as any).accessToken as string
        setAccessToken(backendToken)

        // Buscar dados do usuário no backend
        const ok = await fetchMe()
        if (!ok) {
          // Se falhou, sessão do NextAuth mas backend inválido
          // Limpar e redirecionar
          clearAllTokens()
          setUsuario(null)
          if (!isPublic) {
            router.replace('/login')
          }
        }
        setLoading(false)
        return
      }

      // Se não há sessão NextAuth
      if (sessionStatus === 'unauthenticated') {
        // Tentar com token existente (pode ser refresh)
        const tokenEmMemoria = getAccessToken()
        let ok = false

        if (tokenEmMemoria) {
          ok = await fetchMe()
        }

        if (!ok) {
          // Em rota pública sem token, não precisa aguardar
          if (isPublic && !tokenEmMemoria) {
            clearAllTokens()
            setUsuario(null)
            setLoading(false)
            return
          }

          // Em rota protegida, tentar renovar via cookie
          const renewed = await refreshToken()
          if (renewed) ok = await fetchMe()
        }

        setLoading(false)

        // Redirecionar para login se rota protegida e não autenticado
        if (!ok && !isPublic) {
          router.replace('/login')
        }
        return
      }

      setLoading(false)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionStatus])

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

    // Restrição de acesso para garçons
    if (usuario?.role === 'GARCOM' && !isPublic) {
      const allowed = ['/comandas', '/garcom/relatorio', '/garcom/dashboard']
      const isAllowed = allowed.some(
        (route) => router.pathname === route || router.pathname.startsWith(route + '/')
      )
      if (!isAllowed) {
        router.replace('/comandas')
      }
    }
  }, [router.pathname, usuario, loading, router])

  /**
   * Realiza o login do usuário via Google OAuth.
   * Utiliza a função signIn do NextAuth que redireciona para o Google.
   */
  const login = useCallback(async (): Promise<void> => {
    await signIn('google', { callbackUrl: '/' })
  }, [])

  /**
   * Realiza o logout do usuário.
   * Encerra a sessão NextAuth e limpa todos os tokens locais.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Encerrar sessão NextAuth
      await signOut({ redirect: false })
      // Limpar tokens do backend
      clearAllTokens()
      setUsuario(null)
      router.push('/login')
    } catch {
      // Ignorar erros de rede no logout
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
