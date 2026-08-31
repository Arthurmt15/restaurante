import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { AuthProvider } from '../contexts/AuthContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import '../styles/globals.css'

const ROUTES_WITHOUT_LAYOUT = ['/login', '/kiosk']

/**
 * Componente principal da aplicação.
 * Fornece o contexto de autenticação, layout e error boundary.
 * Algumas rotas (login, kiosk) são renderizadas sem o layout padrão.
 */
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const semLayout = ROUTES_WITHOUT_LAYOUT.includes(router.pathname)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
