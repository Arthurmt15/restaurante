import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet, type Comanda, type GarcomRanking } from '../lib/api'

export default function Dashboard() {
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([])
  const [vendasHoje, setVendasHoje] = useState(0)
  const [stats, setStats] = useState<GarcomRanking[]>([])

  useEffect(() => {
    apiGet<Comanda[]>('/comandas?status=ABERTA').then(setComandasAbertas)
    apiGet<{ totalVendas: number }>('/relatorios/vendas?periodo=diario')
      .then((r) => setVendasHoje(r.totalVendas))
    apiGet<GarcomRanking[]>('/garcons/vendas').then(setStats)
  }, [])

  return (
    <div>
      <div className="page-header"><h2>Dashboard</h2></div>

      <div className="card-grid mb-4">
        <div className="card">
          <h3>Comandas Abertas</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e94560' }}>{comandasAbertas.length}</p>
        </div>
        <div className="card">
          <h3>Vendas Hoje</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {vendasHoje.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Garçons</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.length}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3>Comandas Abertas</h3>
          <Link href="/comandas" className="btn btn-primary btn-sm">Ver Todas</Link>
        </div>
        {comandasAbertas.length === 0 ? (
          <div className="empty-state">Nenhuma comanda aberta</div>
        ) : (
          <table>
            <thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th></tr></thead>
            <tbody>
              {comandasAbertas.map((c) => (
                <tr key={c.id}>
                  <td>Mesa {c.mesa.numero}</td>
                  <td>{c.garcom?.nome || '—'}</td>
                  <td>{c.itens.length}</td>
                  <td className="total-row">R$ {c.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
