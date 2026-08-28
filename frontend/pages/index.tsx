import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'
import { apiGet, type Comanda, type GarcomRanking, type Pagamento } from '../lib/api'

const COLORS = ['var(--color-accent)', 'var(--color-primary)', 'var(--color-danger)', '#0d6efd', '#6f42c1', '#fd7e14']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtCurrency = (v: any) => `R$ ${Number(v).toFixed(2)}`

export default function Dashboard() {
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([])
  const [vendasHoje, setVendasHoje] = useState(0)
  const [stats, setStats] = useState<GarcomRanking[]>([])
  const [vendasPeriodo, setVendasPeriodo] = useState<{ mes: string; vendas: number; total: number }[]>([])
  const [comandasFechadas, setComandasFechadas] = useState<Comanda[]>([])
  const [tendenciaVendas, setTendenciaVendas] = useState<{ dia: string; vendas: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      apiGet<{ comandas: Comanda[] }>('/comandas?status=ABERTA')
        .then((r) => setComandasAbertas(r.comandas)),
      apiGet<{ totalVendas: number }>('/relatorios/vendas?periodo=diario')
        .then((r) => setVendasHoje(r.totalVendas)),
      apiGet<GarcomRanking[]>('/garcons/vendas')
        .then(setStats),
      apiGet<{ meses: { mes: string; vendas: number; total: number; taxa: number }[] }>('/relatorios/comparativo-mensal')
        .then((r) => setVendasPeriodo(r.meses || [])),
      apiGet<{ comandas: Comanda[] }>('/comandas?status=FECHADA&hoje=true')
        .then((r) => setComandasFechadas(r.comandas || [])),
      apiGet<{ dias: { data: string; total: number }[] }>('/relatorios/tendencia-7dias')
        .then((r) => {
          if (r.dias) {
            setTendenciaVendas(r.dias.map(d => ({
              dia: new Date(d.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
              vendas: d.total,
            })))
          }
        }),
    ]).finally(() => setLoading(false))
  }, [])

  const pagamentoData = useMemo(() => {
    const map = new Map<string, number>()
    comandasFechadas.forEach((c) => {
      c.pagamentos.forEach((p: Pagamento) => {
        const label = p.forma || 'Não informado'
        map.set(label, (map.get(label) || 0) + p.valor)
      })
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [comandasFechadas])

  return (
    <div className="dashboard">
      <div className="page-header"><h2>Dashboard</h2></div>

      {/* Stats Cards */}
      <div className="card-grid mb-4">
        {loading ? (
          <>
            <div className="card dashboard-stat-skeleton" />
            <div className="card dashboard-stat-skeleton" />
            <div className="card dashboard-stat-skeleton" />
          </>
        ) : (
          <>
            <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <h3>Comandas Abertas</h3>
              <p className="dashboard-stat-value dashboard-stat-accent">{comandasAbertas.length}</p>
            </div>
            <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--color-accent)' }}>
              <h3>Vendas Hoje</h3>
              <p className="dashboard-stat-value dashboard-stat-accent">R$ {vendasHoje.toFixed(2)}</p>
            </div>
            <div className="card dashboard-stat" style={{ borderLeft: '4px solid #0d6efd' }}>
              <h3>Garçons</h3>
              <p className="dashboard-stat-value">{stats.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="card-grid mb-4">
        <div className="card">
          <h3 className="dashboard-chart-title">Vendas por Período</h3>
          {loading ? (
            <div className="dashboard-chart-loading">
              <div className="skeleton" style={{ width: '80%', height: 200 }} />
            </div>
          ) : vendasPeriodo.length === 0 ? (
            <div className="empty-state">Sem dados de período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vendasPeriodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={fmtCurrency} />
                <Bar dataKey="vendas" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="Vendas" />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="dashboard-chart-title">Vendas por Forma de Pagamento</h3>
          {loading ? (
            <div className="dashboard-chart-loading">
              <div className="skeleton" style={{ width: '60%', height: 200 }} />
            </div>
          ) : pagamentoData.length === 0 ? (
            <div className="empty-state">Sem pagamentos registrados hoje</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pagamentoData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pagamentoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={fmtCurrency} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="dashboard-chart-title">Tendência de Vendas (7 dias)</h3>
          {loading ? (
            <div className="dashboard-chart-loading">
              <div className="skeleton" style={{ width: '80%', height: 200 }} />
            </div>
          ) : tendenciaVendas.length === 0 ? (
            <div className="empty-state">Sem dados de tendência</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tendenciaVendas}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={fmtCurrency} />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#colorVendas)"
                  name="Vendas"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Open Comandas Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3>Comandas Abertas</h3>
          <Link href="/comandas" className="btn btn-primary btn-sm">Ver Todas</Link>
        </div>
        {loading ? (
          <div className="dashboard-table-skeleton">
            <div className="skeleton" style={{ width: '100%', height: 36 }} />
            <div className="skeleton" style={{ width: '100%', height: 36 }} />
            <div className="skeleton" style={{ width: '100%', height: 36 }} />
          </div>
        ) : comandasAbertas.length === 0 ? (
          <div className="empty-state">Nenhuma comanda aberta</div>
        ) : (
          <table>
            <thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th></tr></thead>
            <tbody>
              {comandasAbertas.map((c) => (
                <tr key={c.id}>
                  <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                  <td data-label="Garçom">{c.garcom?.nome || '—'}</td>
                  <td data-label="Itens">{c.itens.length}</td>
                  <td data-label="Total" className="total-row">R$ {c.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}