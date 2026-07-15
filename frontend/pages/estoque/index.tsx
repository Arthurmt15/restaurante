import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, type ItemCardapio, type MovimentoEstoque } from '../../lib/api'

// Controle de estoque: visualização, entrada manual, ajustes e movimentos
export default function EstoquePage() {
  const [itens, setItens] = useState<ItemCardapio[]>([])
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [editando, setEditando] = useState<string | null>(null)
  const [novoEstoque, setNovoEstoque] = useState('')
  const [novoMinimo, setNovoMinimo] = useState('')
  const [entradaItem, setEntradaItem] = useState('')
  const [entradaQtd, setEntradaQtd] = useState('')

  // Carrega itens e movimentos do estoque
  function carregar() {
    apiGet<ItemCardapio[]>('/estoque').then(setItens)
    apiGet<MovimentoEstoque[]>('/estoque/movimentos').then(setMovimentos)
  }

  useEffect(() => { carregar() }, [])

  // Filtra itens conforme seleção (todos ou estoque baixo)
  const itensFiltrados = itens.filter((i) => {
    if (filtro === 'baixo') return i.estoqueAtual <= i.estoqueMinimo
    return true
  })

  // Salva ajuste manual de estoque atual e/ou mínimo
  async function salvarEstoque(id: string) {
    const data: Record<string, number> = {}
    if (novoEstoque) data.estoqueAtual = parseInt(novoEstoque)
    if (novoMinimo) data.estoqueMinimo = parseInt(novoMinimo)
    await apiPut(`/estoque/${id}`, data)
    setEditando(null); setNovoEstoque(''); setNovoMinimo('')
    carregar()
  }

  // Registra entrada de estoque (compra)
  async function entrada() {
    if (!entradaItem || !entradaQtd) return
    await apiPost('/estoque/movimento', {
      itemId: entradaItem, tipo: 'ENTRADA', quantidade: parseInt(entradaQtd), motivo: 'compra',
    })
    setEntradaItem(''); setEntradaQtd('')
    carregar()
  }

  const itensBaixo = itens.filter((i) => i.estoqueAtual <= i.estoqueMinimo && i.estoqueMinimo > 0)

  return (
    <div>
      <div className="page-header"><h2>Controle de Estoque</h2></div>

      {itensBaixo.length > 0 && (
        <div className="card mb-4" style={{ border: '2px solid #dc3545' }}>
          <h3 style={{ color: '#dc3545' }}>⚠ Itens com Estoque Baixo</h3>
          {itensBaixo.map((i) => (
            <p key={i.id} style={{ fontSize: '0.9rem' }}>
              {i.nome} — Atual: <strong>{i.estoqueAtual}</strong> | Mínimo: {i.estoqueMinimo}
            </p>
          ))}
        </div>
      )}

      <div className="card mb-4">
        <h3 className="mb-4">Entrada de Estoque</h3>
        <div className="flex gap-2">
          <select value={entradaItem} onChange={(e) => setEntradaItem(e.target.value)}>
            <option value="">Selecione item</option>
            {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
          <input type="number" placeholder="Quantidade" value={entradaQtd}
            onChange={(e) => setEntradaQtd(e.target.value)} />
          <button className="btn btn-success" onClick={entrada}>Adicionar</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-2 mb-4">
          <button className={`btn ${filtro === 'todos' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFiltro('todos')}>Todos</button>
          <button className={`btn ${filtro === 'baixo' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFiltro('baixo')}>Estoque Baixo</button>
        </div>

        <table>
          <thead><tr><th>Item</th><th>Categoria</th><th>Estoque Atual</th><th>Estoque Mínimo</th><th></th></tr></thead>
          <tbody>
            {itensFiltrados.map((i) => (
              <tr key={i.id}>
                {editando === i.id ? (
                  <>
                    <td>{i.nome}</td>
                    <td>{i.categoria?.nome || '—'}</td>
                    <td><input type="number" value={novoEstoque} placeholder={String(i.estoqueAtual)}
                      onChange={(e) => setNovoEstoque(e.target.value)} style={{ width: 80 }} /></td>
                    <td><input type="number" value={novoMinimo} placeholder={String(i.estoqueMinimo)}
                      onChange={(e) => setNovoMinimo(e.target.value)} style={{ width: 80 }} /></td>
                    <td className="flex gap-2">
                      <button className="btn btn-success btn-sm" onClick={() => salvarEstoque(i.id)}>Salvar</button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditando(null); setNovoEstoque(''); setNovoMinimo('') }}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: i.estoqueAtual <= i.estoqueMinimo && i.estoqueMinimo > 0 ? 'bold' : 'normal' }}>
                      {i.nome}
                      {i.estoqueAtual <= i.estoqueMinimo && i.estoqueMinimo > 0 && <span style={{ color: '#dc3545', marginLeft: 8 }}>⚠</span>}
                    </td>
                    <td>{i.categoria?.nome || '—'}</td>
                    <td>{i.estoqueAtual}</td>
                    <td>{i.estoqueMinimo}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => setEditando(i.id)}>Ajustar</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="mb-4">Últimos Movimentos</h3>
        <table>
          <thead><tr><th>Item</th><th>Tipo</th><th>Qtd</th><th>Motivo</th><th>Data</th></tr></thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={m.id}>
                <td>{m.item.nome}</td>
                <td>
                  <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-closed' : 'badge-open'}`}>
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td>{m.quantidade}</td>
                <td style={{ fontSize: '0.85rem', color: '#666' }}>{m.motivo || '—'}</td>
                <td style={{ fontSize: '0.8rem' }}>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
