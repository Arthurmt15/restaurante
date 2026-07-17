import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { AuthProvider } from '../contexts/AuthContext'
import '../styles/globals.css'

// Rotas que usam layout próprio (sem sidebar)
const ROUTES_WITHOUT_LAYOUT = ['/login']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const semLayout = ROUTES_WITHOUT_LAYOUT.includes(router.pathname)

  return (
    // AuthProvider envolve tudo — o route guard está dentro do AuthProvider
    <AuthProvider>
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
