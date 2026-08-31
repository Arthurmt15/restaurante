import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, type Comanda } from '../../lib/api'

/**
 * Página de relatório individual do garçom.
 * Exibe o resumo de vendas do dia corrente, incluindo total vendido,
 * comissões (taxa de serviço) e histórico de comandas fechadas.
 */
export default function GarcomRelatorioPage() {
  const { usuario } = useAuth()
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (usuario?.garcomId) {
      apiGet<Comanda[]>(`/garcons/${usuario.garcomId}/comandas?hoje=true`)
        .then((res) => {
          setComandas(res)
          setCarregando(false)
        })
        .catch(() => setCarregando(false))
    }
  }, [usuario])

  const totalVendas = comandas.reduce((acc, c) => acc + c.total, 0)
  const totalTaxas = comandas.reduce((acc, c) => acc + c.taxaServico, 0)

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p>Carregando seu relatório...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2>Minhas Vendas (Hoje)</h2>
      </div>

      <div className="card-grid mb-4">
        <div className="card" style={{ borderLeft: '4px solid #c9953f' }}>
          <h3>Total Vendido</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#c9953f' }}>R$ {totalVendas.toFixed(2)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #171c24' }}>
          <h3>Comissões (Taxa de Serviço)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#171c24' }}>R$ {totalTaxas.toFixed(2)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #171b22' }}>
          <h3>Comandas Fechadas</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{comandas.length}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Histórico de Hoje</h3>
        {comandas.length === 0 ? (
          <p className="empty-state">Você ainda não fechou nenhuma comanda hoje.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Horário</th>
                <th>Itens</th>
                <th>Taxa (10%)</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c) => (
                <tr key={c.id}>
                  <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                  <td data-label="Horário">{new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td data-label="Itens">{c.itens.length}</td>
                  <td data-label="Taxa">R$ {c.taxaServico.toFixed(2)}</td>
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
