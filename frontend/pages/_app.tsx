import type { AppProps } from 'next/app'
import Layout from '../components/Layout'
import '../styles/globals.css'

// Componente raiz que envolve todas as páginas com Layout e estilos globais
export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
