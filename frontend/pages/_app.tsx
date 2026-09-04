/**
 * Componente raiz da aplicação Next.js.
 *
 * Fornece:
 * - SessionProvider do NextAuth.js para autenticação via Google
 * - AuthProvider para gerenciar estado de autenticação do backend
 * - Layout principal (excluído para /login e /kiosk)
 * - Error Boundary para capturar erros de renderização
 * - Service Worker para funcionalidade offline (PWA)
 *
 * As rotas /login e /kiosk são renderizadas sem o layout padrão.
 */
import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { SessionProvider } from 'next-auth/react'
import Layout from '../components/Layout'
import { AuthProvider } from '../contexts/AuthContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import '../styles/globals.css'

/** Rotas que não utilizam o layout principal com sidebar */
const ROUTES_WITHOUT_LAYOUT = ['/login', '/kiosk']

/**
 * Componente principal da aplicação.
 *
 * Envolvido por SessionProvider (NextAuth) e AuthProvider (backend).
 * O SessionProvider deve ser o provider externo para que useSession()
 * este disponível em toda a árvore de componentes.
 */
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const semLayout = ROUTES_WITHOUT_LAYOUT.includes(router.pathname)

  /** Registra o Service Worker para funcionalidade PWA */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <ErrorBoundary>
      {/* SessionProvider do NextAuth - deve envolver toda a aplicação */}
      <SessionProvider session={(pageProps as any).session}>
        <AuthProvider>
          <Head>
            <meta name="theme-color" content="#111" />
            <link rel="manifest" href="/manifest.json" />
          </Head>
          {semLayout ? (
            <Component {...pageProps} />
          ) : (
            <Layout>
              <Component {...pageProps} />
            </Layout>
          )}
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
