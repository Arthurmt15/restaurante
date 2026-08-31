import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'
import { validate, loginSchema } from '../lib/validations'
import styles from '../styles/login.module.css'

/**
 * Página de login do sistema.
 * Permite ao usuário autenticar-se com e-mail/senha e redireciona conforme o perfil.
 */
export default function LoginPage() {
  const router = useRouter()
  const { usuario, login, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [errosValidacao, setErrosValidacao] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  useEffect(() => {
    if (!loading && usuario) {
      router.replace(usuario.role === 'SUPERADMIN' ? '/admin' : '/comandas')
    }
  }, [usuario, loading, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando) return

    setErro('')
    setErrosValidacao([])

    const validation = validate(loginSchema, { email: email.trim(), senha })
    if (!validation.success) {
      setErrosValidacao(validation.errors)
      return
    }

    setEnviando(true)
    try {
      await login(email.trim(), senha)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setEnviando(false)
    }
  }

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
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className={styles.loginContainer}>
        {/* Lado direito — login */}
        <section className={styles.loginSide}>
          <div className={styles.loginContent}>
            {/* Logo */}
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🍽</div>
              <h1>Restaurante</h1>
              <p>SISTEMA DE GESTÃO</p>
            </div>

            {/* Título */}
            <div className={styles.loginTitle}>
              <h2>Bem-vindo de volta</h2>
              <p>Entre com suas credenciais para acessar o sistema.</p>
            </div>

            {/* Erros */}
            {erro && (
              <div className={styles.loginError} role="alert" aria-live="polite">
                <span>⚠️</span>
                <span>{erro}</span>
              </div>
            )}
            {errosValidacao.length > 0 && (
              <div className={styles.loginError} role="alert" aria-live="polite">
                <span>⚠️</span>
                <div>{errosValidacao.map((e, i) => <div key={i}>{e}</div>)}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className={styles.formGroup}>
                <label htmlFor="login-email">E-MAIL OU USUÁRIO</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.icon}>♟</span>
                  <input
                    id="login-email"
                    type="text"
                    placeholder="seu@email.com ou usuário"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErro(''); setErrosValidacao([]) }}
                    autoComplete="username"
                    autoFocus
                    disabled={enviando}
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className={styles.formGroup}>
                <label htmlFor="login-senha">SENHA</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.icon}>🔒</span>
                  <input
                    id="login-senha"
                    type={senhaVisivel ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro(''); setErrosValidacao([]) }}
                    autoComplete="current-password"
                    disabled={enviando}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setSenhaVisivel(!senhaVisivel)}
                    tabIndex={-1}
                    aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {senhaVisivel ? '👁️' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Botão */}
              <button
                id="login-submit-btn"
                type="submit"
                className={styles.loginButton}
                disabled={enviando || !email || !senha}
              >
                {enviando ? (
                  <>
                    <span className={styles.loginBtnSpinner} />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            {/* Suporte */}
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
