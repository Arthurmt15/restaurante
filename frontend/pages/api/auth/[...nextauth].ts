/**
 * Configuração do NextAuth.js para autenticação via Google OAuth.
 *
 * Este arquivo gerencia todo o ciclo de vida da autenticação:
 * - Redirecionamento para Google OAuth
 * - Callback após autorização
 * - Sincronização com o backend (criar/buscar usuário no MongoDB)
 * - Armazenamento do JWT do backend na sessão NextAuth
 *
 * Variáveis de ambiente necessárias:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - NEXTAUTH_SECRET
 * - NEXTAUTH_URL
 */
import type { NextAuthOptions, Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

/** URL base da API backend */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/** Email do admin master com acesso total ao sistema */
const ADMIN_MASTER_EMAIL = 'arthurknf@gmail.com'

/**
 * Interface estendida do JWT para incluir dados do backend.
 * O accessToken é o token JWT gerado pelo backend para autorização de rotas.
 */
interface ExtendedJWT extends JWT {
  accessToken?: string
  usuario?: {
    id: string
    email: string
    nome: string
    role: 'SUPERADMIN' | 'CLIENTE' | 'GARCOM'
    status: string
  }
}

/**
 * Interface estendida da sessão para expor dados do usuário.
 * Inclui o accessToken para uso nas requisições API do frontend.
 */
interface ExtendedSession extends Session {
  accessToken?: string
  usuario?: ExtendedJWT['usuario']
}

/**
 * Sincroniza o usuário do Google com o backend.
 *
 * Envia os dados do usuário autenticado via Google para o backend,
 * que cria ou atualiza o registro no MongoDB e retorna o JWT do sistema.
 *
 * @param profile - Dados do perfil do usuário Google
 * @param account - Dados da conta Google (contém o googleId)
 * @returns Objeto com accessToken e dados do usuário
 * @throws Error se a sincronização com o backend falhar
 */
async function syncWithBackend(
  profile: Profile,
  account: Account
): Promise<{ accessToken: string; usuario: ExtendedJWT['usuario'] }> {
  const res = await fetch(`${API}/auth/google-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: profile.email,
      nome: profile.name,
      googleId: account.providerAccountId,
      imagem: profile.image,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Falha ao sincronizar com o servidor')
  }

  return res.json()
}

/**
 * Configuração principal do NextAuth.js.
 *
 * Define os providers de autenticação, callbacks de sessão/JWT,
 * e páginas customizadas do sistema de autenticação.
 */
export const authOptions: NextAuthOptions = {
  /** Providers de autenticação habilitados */
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      /** Escopos necessários para obter email e perfil do usuário */
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],

  /** Páginas customizadas do sistema de autenticação */
  pages: {
    signIn: '/login',
    error: '/login',
  },

  /** Estratégia de sessão: JWT (não usa adapter de banco de dados) */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  /** Chaves de callback para URL de redirecionamento */
  callbacks: {
    /**
     * Callback disparado quando um usuário tenta fazer login.
     *
     * Sincroniza os dados do Google com o backend e armazena
     * o accessToken do backend no JWT da sessão.
     *
     * @param params - Parâmetros do callback (user, account, profile)
     * @returns true se o login foi autorizado, false caso contrário
     */
    async signIn({ user, account, profile }) {
      // Apenas processar login via Google
      if (account?.provider !== 'google') return false

      try {
        const result = await syncWithBackend(profile!, account)

        // Armazenar dados do backend no objeto user para uso no callback jwt
        ;(user as any).accessToken = result.accessToken
        ;(user as any).usuario = result.usuario
        ;(user as any).backendId = result.usuario?.id

        return true
      } catch (error) {
        console.error('[NextAuth] Erro ao sincronizar com backend:', error)
        return false
      }
    },

    /**
     * Callback de JWT: chamado sempre que o token é criado ou atualizado.
     *
     * Armazena o accessToken do backend e dados do usuário no JWT,
     * permitindo que a sessão tenha acesso a esses dados.
     *
     * @param params - Parâmetros (token, user, account, profile, trigger)
     * @returns JWT atualizado com dados do backend
     */
    async jwt({ token, user, account }) {
      // Na primeira vez (login), user contém os dados do backend
      if (account && user) {
        const extendedUser = user as any
        token.accessToken = extendedUser.accessToken
        token.usuario = extendedUser.usuario
      }

      return token
    },

    /**
     * Callback de sessão: expõe dados do JWT na sessão do cliente.
     *
     * Torna o accessToken e dados do usuário disponíveis via useSession()
     * no frontend, permitindo que o AuthContext os utilize.
     *
     * @param params - Parâmetros (session, token)
     * @returns Sessão estendida com accessToken e dados do usuário
     */
    async session({ session, token }): Promise<ExtendedSession> {
      const extendedToken = token as ExtendedJWT
      const extendedSession = session as ExtendedSession

      extendedSession.accessToken = extendedToken.accessToken
      extendedSession.usuario = extendedToken.usuario

      return extendedSession
    },

    /**
     * Callback de redirecionamento pós-login.
     *
     * Redireciona o SUPERADMIN para /admin e os demais para /comandas.
     *
     * @param params - Parâmetros (url, baseUrl)
     * @returns URL de redirecionamento
     */
    async redirect({ url, baseUrl }) {
      // Se a URL é relativa, usar baseUrl
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Se a URL é do mesmo domínio, permitir
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  /** Mensagens de erro customizadas em português */
  messages: {
    error: {
      Configuration: 'Erro na configuração do servidor de autenticação.',
      AccessDenied: 'Acesso negado. Entre em contato com o administrador.',
      Verification: 'O token de verificação expirou ou já foi utilizado.',
      Default: 'Ocorreu um erro ao fazer login.',
    },
  },
}

/** Handler padrão do NextAuth (GET e POST) */
const handler = NextAuth(authOptions)

export default handler
export { handler as GET, handler as POST }
