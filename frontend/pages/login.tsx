import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'
import { validate, loginSchema } from '../lib/validations'

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
      <div className="login-loading">
        <div className="login-spinner" />
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

      <main className="login-container">
        {/* Lado direito — login */}
        <section className="login-side">
          <div className="login-content">
            {/* Logo */}
            <div className="brand">
              <div className="brand-icon">🍽</div>
              <h1>Restaurante</h1>
              <p>SISTEMA DE GESTÃO</p>
            </div>

            {/* Título */}
            <div className="login-title">
              <h2>Bem-vindo de volta</h2>
              <p>Entre com suas credenciais para acessar o sistema.</p>
            </div>

            {/* Erros */}
            {erro && (
              <div className="login-error" role="alert" aria-live="polite">
                <span>⚠️</span>
                <span>{erro}</span>
              </div>
            )}
            {errosValidacao.length > 0 && (
              <div className="login-error" role="alert" aria-live="polite">
                <span>⚠️</span>
                <div>{errosValidacao.map((e, i) => <div key={i}>{e}</div>)}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group">
                <label htmlFor="login-email">E-MAIL OU USUÁRIO</label>
                <div className="input-wrapper">
                  <span className="icon">♟</span>
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
              <div className="form-group">
                <label htmlFor="login-senha">SENHA</label>
                <div className="input-wrapper">
                  <span className="icon">🔒</span>
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
                    className="password-toggle"
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
                className="login-button"
                disabled={enviando || !email || !senha}
              >
                {enviando ? (
                  <>
                    <span className="login-btn-spinner" />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            {/* Suporte */}
            <div className="support">
              Problemas de acesso? Entre em contato
              <a href="#">com o administrador.</a>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        /* ── Reset & Body ────────────────────────────────── */
        .login-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #171717;
        }

        .login-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(201,149,63,0.3);
          border-top-color: #c9953f;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Container ───────────────────────────────────── */
        :global(.login-container) {
          width: 100%;
          max-width: 575px;
          min-height: 100vh;
          background: #fff;
          margin: auto;
          font-family: "DM Sans", sans-serif;
        }

        /* ── Lado do login ───────────────────────────────── */
        :global(.login-side) {
          min-height: 100vh;
          padding: 55px 75px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        :global(.login-content) {
          width: 100%;
          max-width: 575px;
          margin: 0 auto;
        }

        /* ── Brand ────────────────────────────────────────── */
        :global(.brand) {
          text-align: center;
          margin-bottom: 48px;
        }

        :global(.brand-icon) {
          width: 55px;
          height: 55px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c9953f;
          font-size: 42px;
        }

        :global(.brand h1) {
          font-family: "Playfair Display", serif;
          font-size: 34px;
          color: #171b22;
          line-height: 1;
          margin: 0;
        }

        :global(.brand p) {
          margin-top: 12px;
          font-size: 12px;
          letter-spacing: 5px;
          color: #b58943;
          font-weight: 500;
        }

        /* ── Título ──────────────────────────────────────── */
        :global(.login-title) {
          margin-bottom: 34px;
        }

        :global(.login-title h2) {
          font-family: "Playfair Display", serif;
          font-size: 34px;
          color: #151922;
          margin: 0 0 12px;
        }

        :global(.login-title h2::after) {
          content: "";
          display: block;
          width: 70px;
          height: 3px;
          background: #c9953f;
          margin-top: 15px;
        }

        :global(.login-title p) {
          color: #777d87;
          font-size: 15px;
          line-height: 1.6;
          max-width: 430px;
          margin: 0;
        }

        /* ── Erros ────────────────────────────────────────── */
        :global(.login-error) {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(220,53,69,0.08);
          border: 1px solid rgba(220,53,69,0.25);
          border-radius: 8px;
          padding: 12px 16px;
          color: #dc3545;
          font-size: 0.875rem;
          margin-bottom: 20px;
        }

        /* ── Campos ──────────────────────────────────────── */
        :global(.form-group) {
          margin-bottom: 23px;
        }

        :global(.form-group label) {
          display: block;
          color: #252a32;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.2px;
          margin-bottom: 9px;
        }

        :global(.input-wrapper) {
          position: relative;
        }

        :global(.input-wrapper .icon) {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a8f98;
          font-size: 19px;
          pointer-events: none;
        }

        :global(.input-wrapper input) {
          width: 100%;
          height: 57px;
          border: 1px solid #d5d7da;
          border-radius: 7px;
          background: #fff;
          outline: none;
          padding: 0 48px;
          color: #20242b;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        :global(.input-wrapper input::placeholder) {
          color: #a1a5ac;
        }

        :global(.input-wrapper input:focus) {
          border-color: #c9953f;
          box-shadow: 0 0 0 3px rgba(201,149,63,0.10);
        }

        :global(.input-wrapper input:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
        }

        :global(.password-toggle) {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: none;
          cursor: pointer;
          color: #777d87;
          font-size: 18px;
          padding: 4px;
        }

        /* ── Botão ────────────────────────────────────────── */
        :global(.login-button) {
          width: 100%;
          height: 57px;
          border: none;
          border-radius: 7px;
          background: #171c24;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 5px;
        }

        :global(.login-button:hover:not(:disabled)) {
          background: #252c37;
          transform: translateY(-1px);
        }

        :global(.login-button:active:not(:disabled)) {
          transform: translateY(0);
        }

        :global(.login-button:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.login-btn-spinner) {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* ── Suporte ──────────────────────────────────────── */
        :global(.support) {
          margin-top: 35px;
          padding-top: 25px;
          border-top: 1px solid #e2e2e2;
          text-align: center;
          color: #858991;
          font-size: 13px;
          line-height: 1.6;
        }

        :global(.support a) {
          color: #b9893d;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        }

        :global(.support a:hover) {
          text-decoration: underline;
        }

        /* ── Responsivo ───────────────────────────────────── */
        @media (max-width: 480px) {
          :global(.login-side) {
            padding: 30px 22px;
          }
          :global(.brand h1) {
            font-size: 30px;
          }
          :global(.login-title h2) {
            font-size: 29px;
          }
          :global(.brand p) {
            letter-spacing: 3px;
          }
        }
      `}</style>
    </>
  )
}
