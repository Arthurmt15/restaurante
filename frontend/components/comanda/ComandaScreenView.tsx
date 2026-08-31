import { type Comanda, type Categoria, type ItemComanda } from '../../lib/api'
import Tooltip from '../Tooltip'

/** Dados do item sendo adicionado à comanda. */
interface AdicionandoItem {
  id: string
  nome: string
  estoque: number
  controlaEstoque: boolean
}

/** Props da visão de tela da comanda (exclui impressão e modais). */
interface ComandaScreenViewProps {
  comanda: Comanda
  cardapioFiltrado: Categoria[]
  busca: string
  setBusca: (v: string) => void
  abrirFechamento: () => void
  fecharMesa: () => void
  reabrirComanda: () => void
  abrirAdicionarItem: (id: string, nome: string, estoque: number, controlaEstoque: boolean) => void
  abrirEditarItem: (i: ItemComanda) => void
  setRemovendoItemId: (v: string) => void
  setCodigo: (v: string) => void
  setErroCodigo: (v: string) => void
}

/**
 * Visão de tela da comanda.
 * Exibe cabeçalho, itens, totais, pagamento e cardápio para adição de itens.
 * Controlado pela classe CSS no-print (oculto na impressão).
 */
export default function ComandaScreenView({
  comanda, cardapioFiltrado, busca, setBusca, abrirFechamento, fecharMesa,
  reabrirComanda, abrirAdicionarItem, abrirEditarItem,
  setRemovendoItemId, setCodigo, setErroCodigo,
}: ComandaScreenViewProps) {
  const dataAbertura = new Date(comanda.createdAt).toLocaleString('pt-BR')

  return (
    <div className="no-print">
      <div className="page-header">
        <h2>Comanda - Mesa {comanda.mesa.numero}</h2>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => window.print()}>Imprimir Comanda</button>
          {comanda.status === 'ABERTA' && (
            <Tooltip text="Fechar e receber pagamento">
              <button className="btn btn-success" onClick={abrirFechamento}>Fechar Comanda</button>
            </Tooltip>
          )}
          {comanda.status === 'FECHADA' && comanda.mesa.status === 'OCUPADA' && (
            <button className="btn btn-outline" onClick={fecharMesa}>Fechar Mesa</button>
          )}
          {comanda.status === 'FECHADA' ? (
            <button className="badge badge-closed" style={{ border: 'none', cursor: 'pointer' }} onClick={reabrirComanda} title="Clique para reabrir">
              FECHADA ⤾
            </button>
          ) : (
            <span className="badge badge-open">ABERTA</span>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <p><strong>Garçom:</strong> {comanda.garcom?.nome || '—'}</p>
        <p><strong>Aberta em:</strong> {dataAbertura}</p>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4">Itens da Comanda</h3>
        {comanda.itens.length === 0 ? (
          <div className="empty-state">Nenhum item adicionado</div>
        ) : (
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Obs</th><th className="no-print"></th></tr></thead>
            <tbody>
              {comanda.itens.map((i) => (
                <tr key={i.id}>
                  <td data-label="Item">{i.item.nome}</td>
                  <td data-label="Qtd">{i.quantidade}</td>
                  <td data-label="Preço">
                    R$ {i.precoUnit.toFixed(2)}
                    {i.acrescimo && i.acrescimo > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>(valor ajustado)</span>
                    )}
                  </td>
                  <td data-label="Obs" style={{ fontSize: '0.8rem', color: '#666' }}>{i.observacao || '—'}</td>
                  <td data-label="" className="no-print">
                    {comanda.status === 'ABERTA' && (!comanda.pagamentos || comanda.pagamentos.length === 0) && (
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditarItem(i)} title="Ajustar valor (acréscimo)">Editar</button>
                        <Tooltip text="Remover item (requer código)">
                          <button className="btn btn-danger btn-sm" onClick={() => { setRemovendoItemId(i.id); setCodigo(''); setErroCodigo('') }}>X</button>
                        </Tooltip>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4">
          <p><strong>Subtotal:</strong> R$ {comanda.subtotal.toFixed(2)}</p>
          <p><strong>Taxa de Serviço (10%):</strong> R$ {comanda.taxaServico.toFixed(2)}</p>
          {comanda.desconto && comanda.desconto > 0 ? <p><strong>Desconto:</strong> - R$ {comanda.desconto.toFixed(2)}</p> : null}
          <p className="total-row" style={{ fontSize: '1.25rem' }}>Total: R$ {comanda.total.toFixed(2)}</p>
          {comanda.pagamentos && comanda.pagamentos.length > 0 && (
            <div className="mt-2">
              <p><strong>Pagamentos:</strong></p>
              {comanda.pagamentos.map((p) => (
                <p key={p.id} style={{ fontSize: '0.9rem', marginLeft: '1rem' }}>{p.forma}: R$ {p.valor.toFixed(2)}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {comanda.status === 'ABERTA' && (
        <div className="card">
          <h3 className="mb-4">Adicionar Item</h3>
          <div className="search-box">
            <input type="text" placeholder="Buscar item por nome, descrição ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
            {busca ? <button className="search-clear" onClick={() => setBusca('')}>✕</button> : <span className="search-icon">🔍</span>}
          </div>
          {cardapioFiltrado.length === 0 ? (
            <div className="empty-state">Nenhum item encontrado</div>
          ) : (
            cardapioFiltrado.map((cat) => (
              <div key={cat.id} className="mb-4">
                <h4 className="mb-2">{cat.nome}</h4>
                <div className="card-grid">
                  {cat.itens.map((item) => {
                    const semEstoque = item.controlaEstoque && item.estoqueAtual <= 0
                    const indisponivel = item.controlaEstoque ? semEstoque : false
                    return (
                      <div key={item.id} className="card" style={{ padding: '1rem', cursor: indisponivel ? 'not-allowed' : 'pointer', opacity: indisponivel ? 0.5 : 1 }}
                        onClick={() => !indisponivel && abrirAdicionarItem(item.id, item.nome, item.estoqueAtual, item.controlaEstoque)}>
                        <p style={{ fontWeight: 600 }}>{item.nome}</p>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>{item.descricao}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="total-row">R$ {item.preco.toFixed(2)}</span>
                          {item.porcaoTamanho && <span style={{ fontSize: '0.75rem', color: '#999' }}>{item.porcaoTamanho}</span>}
                        </div>
                        {item.controlaEstoque && (
                          <p style={{ fontSize: '0.75rem', color: semEstoque ? '#dc3545' : '#666', marginTop: 4 }}>
                            Estoque: {item.estoqueAtual}{semEstoque && ' (indisponível)'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
