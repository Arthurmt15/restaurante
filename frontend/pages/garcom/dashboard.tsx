import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, apiPatch, type Comanda, type GarcomRanking } from '../../lib/api'

const Skeleton = ({ width, height }: { width: string; height?: number }) => (
  <div style={{
    width, height: height || 20, borderRadius: 6,
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
  }} />
)

export default function GarcomDashboard() {
  const { usuario } = useAuth()
  const router = useRouter()
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([])
  const [todasComandas, setTodasComandas] = useState<Comanda[]>([])
  const [ranking, setRanking] = useState<GarcomRanking[]>([])
  const [carregando, setCarregando] = useState(true)

  const garcomId = usuario?.garcomId

  useEffect(() => {
    if (!garcomId) {
      setCarregando(false)
      return
    }

    Promise.allSettled([
      apiGet<Comanda[]>(`/garcons/${garcomId}/comandas?hoje=true`)
        .then((res) => {
          setTodasComandas(res)
          setComandasAbertas(res.filter((c) => c.status === 'ABERTA'))
        }),
      apiGet<GarcomRanking[]>('/garcons/vendas')
        .then(setRanking),
    ]).finally(() => setCarregando(false))
  }, [garcomId])

  const totalVendasHoje = useMemo(() => {
    return todasComandas
      .filter((c) => c.status === 'FECHADA')
      .reduce((acc, c) => acc + c.total, 0)
  }, [todasComandas])

  const comandasFechadasHoje = useMemo(() => {
    return todasComandas.filter((c) => c.status === 'FECHADA')
  }, [todasComandas])

  const minhaPosicao = useMemo(() => {
    if (!garcomId) return null
    const sorted = [...ranking].sort((a, b) => b.totalVendido - a.totalVendido)
    const idx = sorted.findIndex((g) => g.id === garcomId)
    return idx >= 0 ? idx + 1 : null
  }, [ranking, garcomId])

  const handleFecharComanda = async (comandaId: string) => {
    if (!confirm('Deseja fechar esta comanda?')) return
    try {
      await apiPatch(`/comandas/${comandaId}/fechar`)
      setComandasAbertas((prev) => prev.filter((c) => c.id !== comandaId))
      setTodasComandas((prev) =>
        prev.map((c) => (c.id === comandaId ? { ...c, status: 'FECHADA' } : c))
      )
    } catch {
      alert('Erro ao fechar comanda')
    }
  }

  const skeletonStyle = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `

  return (
    <div>
      <style>{skeletonStyle}</style>
      <div className="page-header">
        <h2>Meu Painel</h2>
        {garcomId && (
          <Link href="/garcom/relatorio" className="btn btn-outline btn-sm">Ver Relatório</Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="card-grid mb-4">
        {carregando ? (
          <>
            <div className="card" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={32} />
            </div>
            <div className="card" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={32} />
            </div>
            <div className="card" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={32} />
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ borderLeft: '4px solid #c9953f' }}>
              <h3>Vendas Hoje</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#c9953f' }}>R$ {totalVendasHoje.toFixed(2)}</p>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #171c24' }}>
              <h3>Comandas Abertas</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#171c24' }}>{comandasAbertas.length}</p>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #0d6efd' }}>
              <h3>Posição no Ranking</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0d6efd' }}>
                {minhaPosicao ? `${minhaPosicao}º` : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Open Comandas */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3>Minhas Comandas Abertas</h3>
          <Link href="/comandas" className="btn btn-primary btn-sm">Abrir Comanda</Link>
        </div>
        {carregando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
          </div>
        ) : comandasAbertas.length === 0 ? (
          <div className="empty-state">Nenhuma comanda aberta no momento</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comandasAbertas.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #eee',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Mesa {c.mesa?.numero}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {c.itens.length} {c.itens.length === 1 ? 'item' : 'itens'} · R$ {c.total.toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/comandas?id=${c.id}`} className="btn btn-outline btn-sm">
                    Ver
                  </Link>
                  <button
                    onClick={() => handleFecharComanda(c.id)}
                    className="btn btn-success btn-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Closed Comandas */}
      <div className="card">
        <h3 className="mb-4">Vendas Fechadas Hoje</h3>
        {carregando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={36} />
          </div>
        ) : comandasFechadasHoje.length === 0 ? (
          <div className="empty-state">Nenhuma comanda fechada ainda</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Horário</th>
                <th>Itens</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {comandasFechadasHoje.map((c) => (
                <tr key={c.id}>
                  <td data-label="Mesa">Mesa {c.mesa?.numero}</td>
                  <td data-label="Horário">
                    {new Date(c.updatedAt || c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
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
