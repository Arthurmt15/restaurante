import { useEffect, useState } from 'react'
import { apiGet, type AtividadeGarcom, type Garcom } from '../../lib/api'
import Layout from '../../components/Layout'

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<AtividadeGarcom[]>([])
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroGarcom, setFiltroGarcom] = useState<string>('')

  function carregarDados() {
    setLoading(true)
    Promise.all([
      apiGet<AtividadeGarcom[]>(`/atividades${filtroGarcom ? `?garcomId=${filtroGarcom}` : ''}`),
      apiGet<Garcom[]>('/garcons')
    ]).then(([ativRes, garconsRes]) => {
      setAtividades(ativRes)
      setGarcons(garconsRes)
      setLoading(false)
    }).catch((err) => {
      console.error(err)
      setLoading(false)
    })
  }

  useEffect(() => {
    carregarDados()
  }, [filtroGarcom])

  function traduzirAcao(acao: string) {
    switch(acao) {
      case 'ABRIU_MESA': return <span className="badge badge-open">ABRIU MESA</span>
      case 'ADICIONOU_ITEM': return <span className="badge badge-ocupada">ADICIONOU ITEM</span>
      case 'REMOVEU_ITEM': return <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>REMOVEU ITEM</span>
      case 'FECHOU_COMANDA': return <span className="badge badge-closed">FECHOU MESA</span>
      default: return <span className="badge">{acao}</span>
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Log de Atividades (Garçons)</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Filtrar por Garçom:</label>
          <select 
            value={filtroGarcom} 
            onChange={(e) => setFiltroGarcom(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">Todos os Garçons (Misto)</option>
            {garcons.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={carregarDados}>Atualizar</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Carregando histórico...</div>
        ) : atividades.length === 0 ? (
          <div className="empty-state">Nenhuma atividade registrada ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Garçom</th>
                <th>Ação</th>
                <th>Detalhes</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map((a) => (
                <tr key={a.id}>
                  <td data-label="Data/Hora" style={{ fontSize: '0.85rem', color: '#555' }}>
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td data-label="Garçom"><strong>{a.garcomNome}</strong></td>
                  <td data-label="Ação">{traduzirAcao(a.acao)}</td>
                  <td data-label="Detalhes">{a.detalhes}</td>
                  <td data-label="Mesa">Mesa {a.mesaNumero}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
