import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'

// Layout principal com sidebar de navegação
export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()

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
      <aside className="sidebar">
        <h1>Restaurante</h1>
        <nav>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={router.pathname === l.href ? 'active' : ''}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
