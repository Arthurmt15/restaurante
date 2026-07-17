import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { usuario, login, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  // Redirecionar se já logado
  useEffect(() => {
    if (!loading && usuario) {
      router.replace(usuario.role === 'SUPERADMIN' ? '/admin' : '/')
    }
  }, [usuario, loading, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando) return

    setErro('')
    setEnviando(true)

    try {
      await login(email.trim(), senha)
      // O AuthContext cuida do redirect após login
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
        <title>Login — Sistema de Restaurante</title>
        <meta name="description" content="Acesse o sistema de gestão do restaurante" />
      </Head>

      <div className="login-page">
        {/* Fundo animado */}
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
        </div>

        <div className="login-container">
          {/* Logo / Branding */}
          <div className="login-brand">
            <div className="login-brand-icon">🍽️</div>
            <h1 className="login-brand-title">Restaurante</h1>
            <p className="login-brand-subtitle">Sistema de Gestão</p>
          </div>

          {/* Card de login */}
          <div className="login-card">
            <div className="login-card-header">
              <h2>Bem-vindo de volta</h2>
              <p>Entre com suas credenciais para acessar o sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Mensagem de erro */}
              {erro && (
                <div className="login-error" role="alert" aria-live="polite">
                  <span className="login-error-icon">⚠️</span>
                  <span>{erro}</span>
                </div>
              )}

              {/* Campo Email */}
              <div className="login-field">
                <label htmlFor="login-email" className="login-label">
                  Email
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">✉️</span>
                  <input
                    id="login-email"
                    type="email"
                    className={`login-input ${erro ? 'login-input-error' : ''}`}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErro('') }}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={enviando}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="login-field">
                <label htmlFor="login-senha" className="login-label">
                  Senha
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">🔒</span>
                  <input
                    id="login-senha"
                    type={senhaVisivel ? 'text' : 'password'}
                    className={`login-input login-input-senha ${erro ? 'login-input-error' : ''}`}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro('') }}
                    required
                    autoComplete="current-password"
                    disabled={enviando}
                  />
                  <button
                    type="button"
                    className="login-toggle-senha"
                    onClick={() => setSenhaVisivel(!senhaVisivel)}
                    tabIndex={-1}
                    aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {senhaVisivel ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Botão de login */}
              <button
                id="login-submit-btn"
                type="submit"
                className="login-btn"
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

            <div className="login-card-footer">
              <p>Problemas de acesso? Entre em contato com o administrador.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0e1a;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .login-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0e1a;
        }

        /* ── Fundo com orbs animados ──────────────────────── */
        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: orbFloat 8s ease-in-out infinite;
        }

        .login-bg-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #2d8a4e, transparent);
          top: -150px; left: -100px;
          animation-delay: 0s;
        }

        .login-bg-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #1a4a7a, transparent);
          bottom: -100px; right: -80px;
          animation-delay: 3s;
        }

        .login-bg-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #4a2d8a, transparent);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 6s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.97); }
        }

        /* ── Container central ─────────────────────────────── */
        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        /* ── Branding ─────────────────────────────────────── */
        .login-brand {
          text-align: center;
        }

        .login-brand-icon {
          font-size: 3rem;
          margin-bottom: 8px;
          display: block;
          filter: drop-shadow(0 0 20px rgba(45, 138, 78, 0.6));
          animation: iconPulse 3s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(45, 138, 78, 0.6)); }
          50% { filter: drop-shadow(0 0 35px rgba(45, 138, 78, 0.9)); }
        }

        .login-brand-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .login-brand-subtitle {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          margin: 4px 0 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* ── Card ─────────────────────────────────────────── */
        .login-card {
          width: 100%;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 36px;
          box-shadow:
            0 25px 50px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.03),
            inset 0 1px 0 rgba(255,255,255,0.06);
          transition: box-shadow 0.3s ease;
        }

        .login-card:hover {
          box-shadow:
            0 30px 60px rgba(0,0,0,0.5),
            0 0 0 1px rgba(45,138,78,0.1),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .login-card-header {
          margin-bottom: 28px;
        }

        .login-card-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px;
        }

        .login-card-header p {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.45);
          margin: 0;
        }

        /* ── Formulário ───────────────────────────────────── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #ff6b7a;
          font-size: 0.875rem;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .login-error-icon {
          flex-shrink: 0;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .login-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.65);
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 14px;
          font-size: 1rem;
          pointer-events: none;
          z-index: 1;
        }

        .login-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        .login-input::placeholder {
          color: rgba(255,255,255,0.25);
        }

        .login-input:focus {
          border-color: rgba(45, 138, 78, 0.6);
          background: rgba(255,255,255,0.07);
          box-shadow: 0 0 0 3px rgba(45, 138, 78, 0.12);
        }

        .login-input-error {
          border-color: rgba(220, 53, 69, 0.5) !important;
        }

        .login-input-error:focus {
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.12) !important;
        }

        .login-input-senha {
          padding-right: 48px;
        }

        .login-toggle-senha {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .login-toggle-senha:hover {
          opacity: 1;
        }

        /* ── Botão principal ──────────────────────────────── */
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 24px;
          background: linear-gradient(135deg, #2d8a4e, #1f6b3a);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(45, 138, 78, 0.3);
          margin-top: 4px;
        }

        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #35a35d, #2d8a4e);
          box-shadow: 0 6px 28px rgba(45, 138, 78, 0.45);
          transform: translateY(-1px);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Spinners ─────────────────────────────────────── */
        .login-btn-spinner, .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .login-spinner {
          width: 36px;
          height: 36px;
          border-color: rgba(45, 138, 78, 0.3);
          border-top-color: #2d8a4e;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Footer ───────────────────────────────────────── */
        .login-card-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center;
        }

        .login-card-footer p {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.3);
          margin: 0;
        }

        /* ── Responsivo ───────────────────────────────────── */
        @media (max-width: 480px) {
          .login-card {
            padding: 28px 24px;
            border-radius: 16px;
          }
        }
      `}</style>
    </>
  )
}
