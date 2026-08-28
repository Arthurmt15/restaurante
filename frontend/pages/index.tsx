import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'
import { apiGet, type Comanda, type GarcomRanking, type Pagamento } from '../lib/api'

const COLORS = ['#2d8a4e', '#f5c518', '#dc3545', '#0d6efd', '#6f42c1', '#fd7e14']

const Skeleton = ({ width, height }: { width: string; height?: number }) => (
  <div style={{
    width, height: height || 20, borderRadius: 6,
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
  }} />
)

const CardSkeleton = () => (
  <div className="card" style={{ minHeight: 180, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
    <Skeleton width="60%" height={16} />
    <Skeleton width="40%" height={32} />
  </div>
)

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

  const skeletonStyle = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `

  return (
    <div>
      <style>{skeletonStyle}</style>
      <div className="page-header"><h2>Dashboard</h2></div>

      {/* Stats Cards */}
      <div className="card-grid mb-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="card" style={{ borderLeft: '4px solid #f5c518' }}>
              <h3>Comandas Abertas</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#2d8a4e' }}>{comandasAbertas.length}</p>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #2d8a4e' }}>
              <h3>Vendas Hoje</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {vendasHoje.toFixed(2)}</p>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #0d6efd' }}>
              <h3>Garçons</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="card-grid mb-4">
        {/* Bar Chart - Vendas por período */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Vendas por Período</h3>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="80%" height={200} />
            </div>
          ) : vendasPeriodo.length === 0 ? (
            <div className="empty-state">Sem dados de período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vendasPeriodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={fmtCurrency} />
                <Bar dataKey="vendas" fill="#2d8a4e" radius={[4, 4, 0, 0]} name="Vendas" />
                <Bar dataKey="total" fill="#f5c518" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart - Vendas por pagamento */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Vendas por Forma de Pagamento</h3>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="60%" height={200} />
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

        {/* Area Chart - Tendência 7 dias */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Tendência de Vendas (7 dias)</h3>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="80%" height={200} />
            </div>
          ) : tendenciaVendas.length === 0 ? (
            <div className="empty-state">Sem dados de tendência</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tendenciaVendas}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d8a4e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2d8a4e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={fmtCurrency} />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="#2d8a4e"
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={36} />
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
