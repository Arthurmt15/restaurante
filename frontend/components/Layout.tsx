import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode, useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ImpersonationBar from './ImpersonationBar'
import { getImpersonationInfo } from '../lib/auth'
import { Toaster } from 'react-hot-toast'
import NotificationListener from './NotificationListener'

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { usuario, logout, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
    document.documentElement.classList.toggle('dark-mode', saved)
  }, [])

  useEffect(() => {
    setIsImpersonating(!!getImpersonationInfo())
  }, [router.pathname])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark-mode', next)
    localStorage.setItem('darkMode', String(next))
  }

  let links = [
    { href: '/',           label: 'Dashboard' },
    { href: '/comandas',   label: 'Comandas' },
    { href: '/cardapio',   label: 'Cardápio' },
    { href: '/mesas',      label: 'Mesas' },
    { href: '/garcons',    label: 'Garçons' },
    { href: '/estoque',    label: 'Estoque' },
    { href: '/relatorios', label: 'Relatórios' },
    { href: '/atividades', label: 'Atividades' },
  ]

  if (usuario?.role === 'GARCOM') {
    links = [
      { href: '/comandas', label: 'Comandas' },
      { href: '/garcom/relatorio', label: 'Minhas Vendas' },
    ]
  } else if (usuario?.role === 'SUPERADMIN') {
    links.push({ href: '/admin', label: '⚙️ Admin' })
  }

  // Enquanto está verificando autenticação, exibir spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2d8a4e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Verificando sessão...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      {/* Barra de impersonation (aparece acima de tudo) */}
      {isImpersonating && <ImpersonationBar />}

      <div className={`layout ${isImpersonating ? 'layout-impersonating' : ''}`}>
        <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-section">
            <h1>Restaurante</h1>
            <button className="dark-toggle" onClick={toggleDark} title={darkMode ? 'Modo claro' : 'Modo escuro'}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <nav>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={router.pathname === l.href || router.pathname.startsWith(l.href + '/') && l.href !== '/'
                  ? 'active'
                  : ''}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Informações do usuário logado + botão de logout */}
          {usuario && (
            <div className="sidebar-bottom">
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {usuario.nome.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-nome">{usuario.nome}</span>
                  <span className="sidebar-user-role">
                    {usuario.role === 'SUPERADMIN' ? '👑 Admin' : usuario.role === 'GARCOM' ? '🍽️ Garçom' : '👤 Cliente'}
                  </span>
                </div>
              </div>
              <button
                id="btn-logout"
                className="sidebar-logout"
                onClick={() => setShowLogoutConfirm(true)}
                title="Sair do sistema"
              >
                <span className="sidebar-logout-icon">→</span>
                <span>Sair</span>
              </button>
            </div>
          )}
        </aside>

        {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

        <main className="content">
          <button className="hamburger no-print" onClick={() => setMenuOpen(true)}>
            <span /><span /><span />
          </button>
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }} onClick={(e) => e.target === e.currentTarget && setShowLogoutConfirm(false)}>
          <div style={{
            background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)', textAlign: 'center', animation: 'logoutModalIn 0.2s ease-out'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👋</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: 'var(--text-primary, #1a1a1a)' }}>
              Sair do Sistema
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary, #666)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Tem certeza que deseja sair do sistema e encerrar a sua sessão atual?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'transparent', color: 'var(--text-primary, #1a1a1a)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #dc3545, #b02a37)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
                }}
              >
                Sim, sair
              </button>
            </div>
          </div>
          <style>{`
            @keyframes logoutModalIn {
              from { opacity: 0; transform: scale(0.9) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      <style jsx>{`
        .layout-impersonating {
          margin-top: 48px; /* altura da barra de impersonation */
        }

        .sidebar-bottom {
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(0,0,0,0.15);
        }

        .sidebar-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: #fff;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-user-nome {
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-role {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.55);
        }

        .sidebar-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: calc(100% - 24px);
          margin: 0 12px 12px;
          padding: 10px 16px;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.35);
          border-radius: 8px;
          color: #ff6b7a;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }

        .sidebar-logout:hover {
          background: rgba(220, 38, 38, 0.3);
          border-color: rgba(220, 38, 38, 0.6);
          color: #ff4d5e;
          transform: translateX(2px);
        }

        .sidebar-logout-icon {
          font-size: 1rem;
          font-weight: 700;
          transition: transform 0.2s;
        }

        .sidebar-logout:hover .sidebar-logout-icon {
          transform: translateX(3px);
        }
      `}</style>
      <Toaster />
      <NotificationListener />
    </>
  )
}
