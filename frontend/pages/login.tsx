/**
 * Página de login do sistema.
 *
 * Esta página foi simplificada para suportar apenas autenticação via Google OAuth.
 * O formulário tradicional de email/senha foi removido.
 *
 * Fluxo:
 * 1. Usuário clica no botão "Entrar com Google"
 * 2. NextAuth redireciona para o Google OAuth
 * 3. Após autorização, o callback signIn sincroniza com o backend
 * 4. Usuário é redirecionado baseado no seu role:
 *    - SUPERADMIN → /admin
 *    - CLIENTE → /comandas
 *    - GARCOM → /comandas
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { signIn } from 'next-auth/react'
import { useAuth } from '../contexts/AuthContext'
import styles from '../styles/login.module.css'

/**
 * Página de login com autenticação exclusiva via Google OAuth.
 *
 * Renderiza um botão estilizado para iniciar o fluxo de login.
 * Redireciona automaticamente se o usuário já estiver autenticado.
 */
export default function LoginPage() {
  const router = useRouter()
  const { usuario, loading } = useAuth()

  /**
   * Redireciona o usuário já autenticado para a página apropriada.
   * SUPERADMIN vai para /admin, os demais para /comandas.
   */
  useEffect(() => {
    if (!loading && usuario) {
      router.replace(usuario.role === 'SUPERADMIN' ? '/admin' : '/comandas')
    }
  }, [usuario, loading, router])

  /**
   * Inicia o fluxo de login via Google OAuth.
   * Utiliza signIn do NextAuth que redireciona para o Google.
   * Em caso de erro, exibe mensagem amigável.
   */
  async function handleGoogleLogin() {
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      // Erro silencioso - NextAuth redireciona automaticamente
    }
  }

  /** Exibe spinner enquanto verifica se há sessão ativa */
  if (loading) {
    return (
      <div className={styles.loginLoading}>
        <div className={styles.loginSpinner} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Login — Restaurante</title>
        <meta name="description" content="Acesse o sistema de gestão do restaurante" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className={styles.loginContainer}>
        {/* Lado direito — login */}
        <section className={styles.loginSide}>
          <div className={styles.loginContent}>
            {/* Logo do sistema */}
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🍽</div>
              <h1>Restaurante</h1>
              <p>SISTEMA DE GESTÃO</p>
            </div>

            {/* Título e instruções */}
            <div className={styles.loginTitle}>
              <h2>Bem-vindo de volta</h2>
              <p>Entre com sua conta Google para acessar o sistema.</p>
            </div>

            {/* Botão de login com Google */}
            <button
              id="login-google-btn"
              type="button"
              className={styles.loginButton}
              onClick={handleGoogleLogin}
            >
              {/* Ícone SVG do Google */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                style={{ marginRight: '12px', flexShrink: 0 }}
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </button>

            {/* Link de suporte */}
            <div className={styles.support}>
              Problemas de acesso? Entre em contato
              <a href="#">com o administrador.</a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
