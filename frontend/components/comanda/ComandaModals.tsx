import { type Comanda, type ItemComanda } from '../../lib/api'

const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix']
type PagamentoInput = { forma: string; valor: string }

/** Props do modal de fechamento de comanda. */
interface FechamentoModalProps {
  comanda: Comanda
  desconto: string
  setDesconto: (v: string) => void
  jaPago: number
  pagamentos: PagamentoInput[]
  setPagamentos: (p: PagamentoInput[]) => void
  erroPagamento: string
  setErroPagamento: (v: string) => void
  setFechando: (v: boolean) => void
  adicionarPagamento: () => void
  removerPagamento: (idx: number) => void
  atualizarPagamento: (idx: number, campo: 'forma' | 'valor', valor: string) => void
  fecharComanda: () => void
}

/**
 * Modal de fechamento de comanda.
 * Exibe formas de pagamento, desconto e resumo do fechamento.
 */
export function FechamentoModal({
  comanda, desconto, setDesconto, jaPago, pagamentos,
  erroPagamento, setFechando, adicionarPagamento, removerPagamento,
  atualizarPagamento, fecharComanda,
}: FechamentoModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Fechar Comanda</h3>
              <span className="modal-total">
                R$ {Math.max(0, comanda.total - (parseFloat(desconto) || 0)).toFixed(2)}
              </span>
            </div>
            {jaPago > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                Já pago: R$ {jaPago.toFixed(2)} | Restante: R$ {Math.max(0, comanda.total - (parseFloat(desconto) || 0) - jaPago).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <div className="modal-body">
          <div className="cardapio-novo-field" style={{ marginBottom: '1.5rem', width: '100%', flex: 'none' }}>
            <label>Desconto Adicional</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', color: '#666', fontWeight: 600, pointerEvents: 'none' }}>
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div className="pagamento-lista">
            {pagamentos.map((p, idx) => (
              <div key={idx} className="pagamento-linha">
                <select
                  value={p.forma}
                  onChange={(e) => atualizarPagamento(idx, 'forma', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                {pagamentos.length > 1 && (
                  <button className="pagamento-remover" onClick={() => removerPagamento(idx)}>✕</button>
                )}
              </div>
            ))}
          </div>

          <button className="pagamento-adicionar" onClick={adicionarPagamento}>
            + Adicionar forma de pagamento
          </button>

          {pagamentos.length > 0 && (
            <div className="pagamento-resumo">
              <div>
                <span>Total lançado</span>
                {jaPago > 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#999', display: 'block' }}>
                    Já pago: R$ {jaPago.toFixed(2)}
                  </span>
                )}
              </div>
              <span className="pagamento-resumo-valor">
                R$ {pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0).toFixed(2)}
              </span>
            </div>
          )}

          {erroPagamento && (
            <div className="pagamento-erro">{erroPagamento}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => { setFechando(false) }}>Cancelar</button>
          <button className="btn btn-primary" onClick={fecharComanda}>Confirmar Fechamento</button>
        </div>
      </div>
    </div>
  )
}

/** Dados do item sendo adicionado à comanda. */
interface AdicionandoItem {
  id: string
  nome: string
  estoque: number
  controlaEstoque: boolean
}

/** Props do modal de quantidade ao adicionar item. */
interface QuantidadeModalProps {
  adicionandoItem: AdicionandoItem
  setAdicionandoItem: (v: AdicionandoItem | null) => void
  quantidade: number
  setQuantidade: (v: number) => void
  observacaoItem: string
  setObservacaoItem: (v: string) => void
  confirmarAdicionarItem: () => void
}

/**
 * Modal de quantidade ao adicionar item à comanda.
 * Permite informar quantidade e observação antes de confirmar.
 */
export function QuantidadeModal({
  adicionandoItem, setAdicionandoItem, quantidade, setQuantidade,
  observacaoItem, setObservacaoItem, confirmarAdicionarItem,
}: QuantidadeModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ padding: '1.5rem', minWidth: 320 }}>
        <h3 className="mb-4">Adicionar Item</h3>
        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{adicionandoItem.nome}</p>

        <div className="form-group">
          <label>Quantidade</label>
          <input
            type="number"
            min={1}
            max={adicionandoItem.controlaEstoque ? adicionandoItem.estoque : 999}
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {adicionandoItem.controlaEstoque && (
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Estoque disponível: {adicionandoItem.estoque}</span>
          )}
        </div>

        <div className="form-group">
          <label>Observação (opcional)</label>
          <input
            type="text"
            placeholder="Ex.: sem cebola, bem passado..."
            value={observacaoItem}
            onChange={(e) => setObservacaoItem(e.target.value)}
          />
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'end', marginTop: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setAdicionandoItem(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={confirmarAdicionarItem}>
            Adicionar ({quantidade}x)
          </button>
        </div>
      </div>
    </div>
  )
}

/** Dados do item sendo editado (ajuste de valor). */
interface EditandoItem {
  id: string
  nome: string
  base: number
  acrescimo: number
}

/** Props do modal de ajuste de valor (acréscimo) de um item. */
interface AjusteValorModalProps {
  editandoItem: EditandoItem
  setEditandoItem: (v: EditandoItem | null) => void
  novoValor: string
  setNovoValor: (v: string) => void
  salvarEditarItem: () => void
}

/**
 * Modal de ajuste de valor (acréscimo) de um item já existente na comanda.
 * Permite informar o valor final com taxa de serviço.
 */
export function AjusteValorModal({
  editandoItem, setEditandoItem, novoValor, setNovoValor, salvarEditarItem,
}: AjusteValorModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ padding: '1.5rem', minWidth: 340 }}>
        <h3 className="mb-4">Ajustar Valor do Item</h3>
        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{editandoItem.nome}</p>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Valor original: <strong>R$ {editandoItem.base.toFixed(2)}</strong>
          {editandoItem.acrescimo > 0 && ` | Acréscimo atual: R$ ${editandoItem.acrescimo.toFixed(2)}`}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '1rem' }}>
          Informe o valor final com taxa de serviço. O acréscimo não aparece na comanda impressa.
        </p>

        <div className="form-group">
          <label>Valor final do item (com taxa de serviço)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
          />
          <span style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginTop: 4 }}>
            Valor a ser cobrado no total: R$ {((parseFloat(novoValor) || 0)).toFixed(2)}
          </span>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'end', marginTop: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setEditandoItem(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvarEditarItem}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

/** Props do modal de autorização para remoção de item. */
interface AutorizacaoModalProps {
  removendoItemId: string | null
  setRemovendoItemId: (v: string | null) => void
  codigo: string
  setCodigo: (v: string) => void
  erroCodigo: string
  setErroCodigo: (v: string) => void
  removerItem: (itemId: string) => void
}

/**
 * Modal de autorização (código) para remoção de item da comanda.
 * Solicita código de autorização antes de confirmar a exclusão.
 */
export function AutorizacaoModal({
  removendoItemId, setRemovendoItemId, codigo, setCodigo,
  erroCodigo, setErroCodigo, removerItem,
}: AutorizacaoModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ padding: '1.5rem', minWidth: 300 }}>
        <h3 className="mb-4">Autorização necessária</h3>
        <p style={{ marginBottom: '1rem', color: '#666' }}>Digite o código de autorização para remover o item:</p>
        <input
          type="password"
          placeholder="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
          autoFocus
        />
        {erroCodigo && <p style={{ color: '#dc3545', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{erroCodigo}</p>}
        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
          <button className="btn btn-outline" onClick={() => { setRemovendoItemId(null); setCodigo(''); setErroCodigo('') }}>Cancelar</button>
          <button className="btn btn-danger" disabled={!codigo} onClick={() => removerItem(removendoItemId!)}>Remover</button>
        </div>
      </div>
    </div>
  )
}
