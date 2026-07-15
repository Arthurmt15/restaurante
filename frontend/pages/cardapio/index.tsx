import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, type Categoria, type ItemCardapio } from '../../lib/api'

// Página de gerenciamento do cardápio (CRUD de itens por categoria)
export default function CardapioPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<ItemCardapio | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novaCat, setNovaCat] = useState('')

  // Carrega categorias e itens do cardápio
  function carregar() { apiGet<Categoria[]>('/cardapio').then(setCategorias) }
  useEffect(() => { carregar() }, [])

  // Cria um novo item no cardápio
  async function salvarNovo() {
    if (!novoNome || !novoPreco || !novaCat) return
    await apiPost('/cardapio', { nome: novoNome, preco: parseFloat(novoPreco), categoriaId: novaCat })
    setNovoNome(''); setNovoPreco(''); setNovaCat('')
    carregar()
  }

  // Salva alterações em um item existente
  async function atualizar(item: ItemCardapio) {
    await apiPut(`/cardapio/${item.id}`, { nome: item.nome, preco: item.preco })
    setEditando(null); carregar()
  }

  // Desativa (soft-delete) um item do cardápio
  async function desativar(id: string) {
    if (!confirm('Desativar item?')) return
    await apiDelete(`/cardapio/${id}`); carregar()
  }

  return (
    <div>
      <div className="page-header"><h2>Cardápio</h2></div>

      <div className="card mb-4">
        <h3 className="mb-4">Novo Item</h3>
        <div className="cardapio-novo-form">
          <div className="cardapio-novo-field">
            <label>Nome</label>
            <input placeholder="Ex.: Cerveja garrafa" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          </div>
          <div className="cardapio-novo-field">
            <label>Preço</label>
            <input placeholder="0,00" type="number" step="0.01" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} />
          </div>

          <div className="cardapio-novo-field">
            <label>Categoria</label>
            <select value={novaCat} onChange={(e) => setNovaCat(e.target.value)}>
              <option value="">Selecione...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button className="btn btn-primary cardapio-novo-btn" onClick={salvarNovo}>Adicionar</button>
        </div>
      </div>

      {categorias.map((cat) => (
        <div key={cat.id} className="card mb-4">
          <h3 className="mb-4">{cat.nome}</h3>
          <table>
            <thead><tr><th>Nome</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
            <tbody>
              {cat.itens.map((item) => (
                <tr key={item.id}>
                  {editando?.id === item.id ? (
                    <>
                      <td data-label="Nome"><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></td>
                      <td data-label="Preço"><input type="number" step="0.01" value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: parseFloat(e.target.value) })} /></td>
                      <td data-label="">
                        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                          <button className="btn btn-success btn-sm" onClick={() => atualizar(editando)}>Salvar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Nome">{item.nome}</td>
                      <td data-label="Preço">R$ {item.preco.toFixed(2)}</td>
                      <td data-label="Estoque">
                        <span style={{ color: item.estoqueAtual <= item.estoqueMinimo && item.estoqueMinimo > 0 ? '#dc3545' : 'inherit' }}>
                          {item.estoqueAtual}
                        </span>
                        {item.estoqueMinimo > 0 && <span style={{ fontSize: '0.75rem', color: '#999' }}> / {item.estoqueMinimo}</span>}
                      </td>
                      <td data-label="">
                        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...item })}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => desativar(item.id)}>X</button>
                        </div>
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
