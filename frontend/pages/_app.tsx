import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { AuthProvider } from '../contexts/AuthContext'
import '../styles/globals.css'

const ROUTES_WITHOUT_LAYOUT = ['/login', '/kiosk']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const semLayout = ROUTES_WITHOUT_LAYOUT.includes(router.pathname)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
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
  )
}
