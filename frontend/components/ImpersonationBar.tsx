import { getImpersonationInfo, clearImpersonation, getAccessToken } from '../lib/auth'
import { setAccessToken } from '../lib/auth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * Barra de impersonation exibida no topo quando o Superadmin
 * está navegando como um cliente específico.
 * Mostra o nome do cliente e oferece botão para retornar ao painel.
 */
export default function ImpersonationBar() {
  const router = useRouter()
  const [info, setInfo] = useState(getImpersonationInfo())
  const [voltando, setVoltando] = useState(false)

  useEffect(() => {
    setInfo(getImpersonationInfo())
  }, [router.pathname])

  if (!info) return null

  async function handleVoltar() {
    setVoltando(true)
    try {
      // Encerrar impersonation no servidor (auditoria)
      const token = getAccessToken()
      await fetch(`${API}/admin/impersonate/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}) // ignora falhas de rede

      // Limpar token de impersonation
      clearImpersonation()

      // Renovar o access token original via refresh cookie
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json()
        setAccessToken(accessToken)
      }

      router.push('/admin')
    } catch (err) {
      console.error('Erro ao encerrar impersonation:', err)
      setVoltando(false)
    }
  }

  return (
    <div className="impersonation-bar" role="status" aria-live="polite">
      <div className="impersonation-content">
        <span className="impersonation-icon">👁️</span>
        <span className="impersonation-text">
          Você está visualizando como{' '}
          <strong className="impersonation-name">{info.nome}</strong>
          <span className="impersonation-email"> ({info.email})</span>
        </span>
      </div>

      <button
        id="btn-retornar-admin"
        className="impersonation-btn"
        onClick={handleVoltar}
        disabled={voltando}
      >
        {voltando ? (
          <>
            <span className="impersonation-spinner" />
            Retornando...
          </>
        ) : (
          <>
            ← Retornar ao Painel Admin
          </>
        )}
      </button>

      <style jsx>{`
        .impersonation-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          box-shadow: 0 2px 20px rgba(124, 58, 237, 0.5);
          gap: 16px;
          flex-wrap: wrap;
        }

        .impersonation-content {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-size: 0.875rem;
        }

        .impersonation-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .impersonation-text {
          line-height: 1.4;
        }

        .impersonation-name {
          font-weight: 700;
        }

        .impersonation-email {
          opacity: 0.75;
          font-size: 0.8rem;
        }

        .impersonation-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }

        .impersonation-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.25);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-1px);
        }

        .impersonation-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .impersonation-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .impersonation-bar {
            flex-direction: column;
            align-items: flex-start;
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  )
}
