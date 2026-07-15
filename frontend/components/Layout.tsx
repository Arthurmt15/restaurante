import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode, useState, useEffect } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
    document.documentElement.classList.toggle('dark-mode', saved)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark-mode', next)
    localStorage.setItem('darkMode', String(next))
  }

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/comandas', label: 'Comandas' },
    { href: '/cardapio', label: 'Cardápio' },
    { href: '/mesas', label: 'Mesas' },
    { href: '/garcons', label: 'Garçons' },
    { href: '/estoque', label: 'Estoque' },
    { href: '/relatorios', label: 'Relatórios' },
  ]

  return (
    <div className="layout">
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
              className={router.pathname === l.href ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="content">
        <button className="hamburger no-print" onClick={() => setMenuOpen(true)}>
          <span /><span /><span />
        </button>
        {children}
      </main>
    </div>
  )
}
