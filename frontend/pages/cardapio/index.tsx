import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, type Categoria, type ItemCardapio } from '../../lib/api'
import { validate, categoriaSchema, itemCardapioSchema } from '../../lib/validations'
import Tooltip from '../../components/Tooltip'

// Página de gerenciamento do cardápio (CRUD de itens por categoria)
export default function CardapioPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<ItemCardapio | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novoControlaEstoque, setNovoControlaEstoque] = useState(false)
  const [novaCat, setNovaCat] = useState('')
  const [novaCatNome, setNovaCatNome] = useState('')
  const [erroItem, setErroItem] = useState('')
  const [erroCat, setErroCat] = useState('')

  // Carrega categorias e itens do cardápio
  function carregar() { apiGet<Categoria[]>('/cardapio').then(setCategorias) }
  useEffect(() => { carregar() }, [])

  // Cria um novo item no cardápio
  async function salvarNovo() {
    const validation = validate(itemCardapioSchema, {
      nome: novoNome,
      preco: parseFloat(novoPreco) || 0,
      categoriaId: novaCat,
      controlaEstoque: novoControlaEstoque,
    })
    if (!validation.success) {
      setErroItem(validation.errors[0])
      return
    }
    setErroItem('')
    try {
      await apiPost('/cardapio', { nome: novoNome, preco: parseFloat(novoPreco), categoriaId: novaCat, controlaEstoque: novoControlaEstoque })
      setNovoNome(''); setNovoPreco(''); setNovaCat(''); setNovoControlaEstoque(false)
      carregar()
    } catch (e: any) {
      setErroItem(e.message || 'Erro ao adicionar item')
    }
  }

  // Cria uma nova categoria
  async function salvarNovaCategoria() {
    const validation = validate(categoriaSchema, { nome: novaCatNome })
    if (!validation.success) {
      setErroCat(validation.errors[0])
      return
    }
    setErroCat('')
    try {
      await apiPost('/cardapio/categoria', { nome: novaCatNome })
      setNovaCatNome('')
      carregar()
    } catch (e: any) {
      setErroCat(e.message || 'Erro ao criar categoria')
    }
  }

  // Salva alterações em um item existente
  async function atualizar(item: ItemCardapio) {
    await apiPut(`/cardapio/${item.id}`, { nome: item.nome, preco: item.preco, controlaEstoque: item.controlaEstoque })
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

      <div className="card mb-4" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Adicionar Categoria */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3 className="mb-4">Nova Categoria</h3>
          {erroCat && <div className="form-error mb-4">{erroCat}</div>}
          <div className="cardapio-novo-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cardapio-novo-field">
              <label>Nome da Categoria</label>
              <input placeholder="Ex.: Bebidas, Sobremesas" value={novaCatNome} onChange={(e) => setNovaCatNome(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={salvarNovaCategoria}>Criar Categoria</button>
          </div>
        </div>

        {/* Adicionar Item */}
        <div style={{ flex: 1, minWidth: '300px', borderLeft: '1px solid #e5e7eb', paddingLeft: '2rem' }}>
          <h3 className="mb-4">Novo Item</h3>
          {erroItem && <div className="form-error mb-4">{erroItem}</div>}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={novoControlaEstoque}
                onChange={(e) => setNovoControlaEstoque(e.target.checked)}
              />
              Controla estoque (baixa automática na venda)
            </label>
            <button className="btn btn-primary cardapio-novo-btn" onClick={salvarNovo}>Adicionar Item</button>
          </div>
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
                      <td data-label="Estoque">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={editando.controlaEstoque}
                            onChange={(e) => setEditando({ ...editando, controlaEstoque: e.target.checked })}
                          />
                          Controla
                        </label>
                      </td>
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
                        {item.controlaEstoque && <span style={{ fontSize: '0.7rem', color: '#1a73e8', marginLeft: '0.4rem' }}>(controlado)</span>}
                      </td>
                      <td data-label="">
                        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...item })}>Editar</button>
                          <Tooltip text="Desativar item">
                            <button className="btn btn-danger btn-sm" onClick={() => desativar(item.id)}>X</button>
                          </Tooltip>
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
