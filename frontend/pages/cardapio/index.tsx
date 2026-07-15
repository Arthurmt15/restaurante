import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, type Categoria, type ItemCardapio } from '../../lib/api'

export default function CardapioPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<ItemCardapio | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novaCat, setNovaCat] = useState('')

  function carregar() { apiGet<Categoria[]>('/cardapio').then(setCategorias) }
  useEffect(() => { carregar() }, [])

  async function salvarNovo() {
    if (!novoNome || !novoPreco || !novaCat) return
    await apiPost('/cardapio', { nome: novoNome, preco: parseFloat(novoPreco), descricao: novaDesc || undefined, categoriaId: novaCat })
    setNovoNome(''); setNovoPreco(''); setNovaDesc(''); setNovaCat('')
    carregar()
  }

  async function atualizar(item: ItemCardapio) {
    await apiPut(`/cardapio/${item.id}`, { nome: item.nome, preco: item.preco, descricao: item.descricao || undefined })
    setEditando(null); carregar()
  }

  async function desativar(id: string) {
    if (!confirm('Desativar item?')) return
    await apiDelete(`/cardapio/${id}`); carregar()
  }

  return (
    <div>
      <div className="page-header"><h2>Cardápio</h2></div>

      <div className="card mb-4">
        <h3 className="mb-4">Novo Item</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem' }}>
          <input placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          <input placeholder="Preço" type="number" step="0.01" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} />
          <input placeholder="Descrição" value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} />
          <select value={novaCat} onChange={(e) => setNovaCat(e.target.value)}>
            <option value="">Categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button className="btn btn-primary" onClick={salvarNovo}>Adicionar</button>
        </div>
      </div>

      {categorias.map((cat) => (
        <div key={cat.id} className="card mb-4">
          <h3 className="mb-4">{cat.nome}</h3>
          <table>
            <thead><tr><th>Nome</th><th>Descrição</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
            <tbody>
              {cat.itens.map((item) => (
                <tr key={item.id}>
                  {editando?.id === item.id ? (
                    <>
                      <td><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></td>
                      <td><input value={editando.descricao || ''} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} /></td>
                      <td><input type="number" step="0.01" value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: parseFloat(e.target.value) })} /></td>
                      <td className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => atualizar(editando)}>Salvar</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.nome}</td>
                      <td style={{ color: '#666' }}>{item.descricao || '—'}</td>
                      <td>R$ {item.preco.toFixed(2)}</td>
                      <td>
                        <span style={{ color: item.estoqueAtual <= item.estoqueMinimo && item.estoqueMinimo > 0 ? '#dc3545' : 'inherit' }}>
                          {item.estoqueAtual}
                        </span>
                        {item.estoqueMinimo > 0 && <span style={{ fontSize: '0.75rem', color: '#999' }}> / {item.estoqueMinimo}</span>}
                      </td>
                      <td className="flex gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...item })}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => desativar(item.id)}>X</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
