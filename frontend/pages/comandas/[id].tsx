import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiPost, apiDelete, apiPatch, type Comanda, type Categoria, type ItemComanda } from '../../lib/api'
import { FechamentoModal, QuantidadeModal, AjusteValorModal, AutorizacaoModal } from '../../components/comanda/ComandaModals'
import ComandaPrintView from '../../components/comanda/ComandaPrintView'
import ComandaScreenView from '../../components/comanda/ComandaScreenView'

const TAXA_SERVICO = 0.1
type PagamentoInput = { forma: string; valor: string }

/** Página de detalhes de uma comanda. Exibe itens, totais, adição/remoção, ajuste de valores e impressão. */
export default function ComandaDetalhe() {
  const router = useRouter()
  const { id } = router.query
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [cardapio, setCardapio] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [removendoItemId, setRemovendoItemId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erroCodigo, setErroCodigo] = useState('')
  const [adicionandoItem, setAdicionandoItem] = useState<{ id: string; nome: string; estoque: number; controlaEstoque: boolean } | null>(null)
  const [editandoItem, setEditandoItem] = useState<{ id: string; nome: string; base: number; acrescimo: number } | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [observacaoItem, setObservacaoItem] = useState('')
  const [busca, setBusca] = useState('')
  const [fechando, setFechando] = useState(false)
  const [pagamentos, setPagamentos] = useState<PagamentoInput[]>([{ forma: '', valor: '' }])
  const [erroPagamento, setErroPagamento] = useState('')
  const [jaPago, setJaPago] = useState(0)
  const [desconto, setDesconto] = useState('')

  function carregar() {
    if (!id) return
    apiGet<Comanda>(`/comandas/${id}`).then(setComanda)
    apiGet<Categoria[]>('/cardapio').then(setCardapio)
    setLoading(false)
  }
  async function fecharMesa() {
    if (!comanda) return
    await apiPatch(`/mesas/${comanda.mesaId}/status`)
    carregar()
  }
  function abrirFechamento() {
    if (!comanda) return
    setFechando(true)
    setDesconto('')
    const pago = comanda.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0
    setJaPago(pago)
    const restante = comanda.total - pago
    setPagamentos([{ forma: '', valor: restante > 0 ? restante.toFixed(2) : '0.00' }])
    setErroPagamento('')
  }
  function adicionarPagamento() {
    const totalPago = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)
    const valDesconto = parseFloat(desconto) || 0
    const restante = (comanda ? Math.max(0, comanda.total - valDesconto - jaPago) : 0) - totalPago
    setPagamentos([...pagamentos, { forma: '', valor: restante > 0 ? restante.toFixed(2) : '0.00' }])
  }
  function removerPagamento(idx: number) {
    if (pagamentos.length <= 1) return
    setPagamentos(pagamentos.filter((_, i) => i !== idx))
  }
  function atualizarPagamento(idx: number, campo: 'forma' | 'valor', valor: string) {
    const novos = [...pagamentos]
    novos[idx] = { ...novos[idx], [campo]: valor }
    setPagamentos(novos)
  }
  async function fecharComanda() {
    if (!id) return
    const valDesconto = parseFloat(desconto) || 0
    const novoTotal = Math.max(0, (comanda?.subtotal || 0) + (comanda?.taxaServico || 0) - valDesconto)
    const restante = novoTotal - jaPago
    if (restante > 0) {
      const pagamentosValidos = pagamentos.filter((p) => p.forma && p.valor)
      if (pagamentosValidos.length === 0) {
        setErroPagamento('Adicione ao menos um método de pagamento')
        return
      }
      const totalPago = pagamentosValidos.reduce((acc, p) => acc + parseFloat(p.valor), 0)
      if (Math.abs(totalPago - restante) > 0.01) {
        setErroPagamento(`Valor a pagar (R$ ${restante.toFixed(2)}) difere do informado (R$ ${totalPago.toFixed(2)})`)
        return
      }
    }
    setErroPagamento('')
    const pagamentosValidos = pagamentos.filter((p) => p.forma && p.valor)
    await apiPatch(`/comandas/${id}/fechar`, {
      pagamentos: pagamentosValidos.map((p) => ({ forma: p.forma, valor: parseFloat(p.valor) })),
      desconto: valDesconto > 0 ? valDesconto : undefined,
    })
    setFechando(false)
    carregar()
  }
  useEffect(() => { carregar() }, [id])

  const cardapioFiltrado = useMemo(() => {
    if (!busca.trim()) return cardapio
    const termo = busca.toLowerCase()
    return cardapio
      .map((cat) => ({
        ...cat,
        itens: cat.itens.filter((item) =>
          item.nome.toLowerCase().includes(termo) ||
          (item.nomeEn && item.nomeEn.toLowerCase().includes(termo)) ||
          (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
          cat.nome.toLowerCase().includes(termo)
        ),
      }))
      .filter((cat) => cat.itens.length > 0)
  }, [cardapio, busca])

  function abrirAdicionarItem(itemId: string, nome: string, estoque: number, controlaEstoque: boolean) {
    setAdicionandoItem({ id: itemId, nome, estoque, controlaEstoque })
    setQuantidade(1)
    setObservacaoItem('')
  }
  async function confirmarAdicionarItem() {
    if (!adicionandoItem || !id) return
    await apiPost(`/comandas/${id}/itens`, { itemId: adicionandoItem.id, quantidade, observacao: observacaoItem || undefined })
    setAdicionandoItem(null)
    carregar()
  }
  function abrirEditarItem(i: ItemComanda) {
    const base = i.item.preco * i.quantidade
    const acrescimo = i.acrescimo || 0
    setEditandoItem({ id: i.id, nome: i.item.nome, base, acrescimo })
    setNovoValor(((base + acrescimo) * (1 + TAXA_SERVICO)).toFixed(2))
  }
  async function salvarEditarItem() {
    if (!editandoItem || !id) return
    const valorFinal = Math.max(0, parseFloat(novoValor.replace(',', '.')) || 0)
    await apiPatch(`/comandas/${id}/itens/${editandoItem.id}`, {
      acrescimo: Math.max(0, valorFinal / (1 + TAXA_SERVICO) - editandoItem.base),
    })
    setEditandoItem(null)
    carregar()
  }
  async function reabrirComanda() {
    if (!id) return
    if (!confirm('Reabrir esta comanda?')) return
    try { await apiPatch(`/comandas/${id}/reabrir`); carregar() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao reabrir comanda') }
  }
  async function removerItem(itemId: string) {
    if (!codigo || !id) return
    setErroCodigo('')
    try {
      await apiDelete(`/comandas/${id}/itens/${itemId}`, { 'x-codigo-exclusao': codigo })
      setRemovendoItemId(null); setCodigo(''); carregar()
    } catch (e: unknown) { setErroCodigo(e instanceof Error ? e.message : 'Erro') }
  }

  if (loading || !comanda) return <div className="empty-state">Carregando...</div>
  const valorOriginalItem = (i: ItemComanda) => i.precoUnit - (i.acrescimo || 0)
  const subtotalImpresso = comanda.itens.reduce((acc, i) => acc + valorOriginalItem(i), 0)
  const taxaImpressa = Math.round(subtotalImpresso * TAXA_SERVICO * 100) / 100

  return (
    <div>
      <ComandaScreenView comanda={comanda} cardapioFiltrado={cardapioFiltrado} busca={busca} setBusca={setBusca}
        abrirFechamento={abrirFechamento} fecharMesa={fecharMesa} reabrirComanda={reabrirComanda}
        abrirAdicionarItem={abrirAdicionarItem} abrirEditarItem={abrirEditarItem}
        setRemovendoItemId={setRemovendoItemId} setCodigo={setCodigo} setErroCodigo={setErroCodigo} />

      {fechando && comanda && (
        <FechamentoModal comanda={comanda} desconto={desconto} setDesconto={setDesconto} jaPago={jaPago}
          pagamentos={pagamentos} setPagamentos={setPagamentos} erroPagamento={erroPagamento} setErroPagamento={setErroPagamento}
          setFechando={setFechando} adicionarPagamento={adicionarPagamento} removerPagamento={removerPagamento}
          atualizarPagamento={atualizarPagamento} fecharComanda={fecharComanda} />
      )}
      {adicionandoItem && (
        <QuantidadeModal adicionandoItem={adicionandoItem} setAdicionandoItem={setAdicionandoItem} quantidade={quantidade}
          setQuantidade={setQuantidade} observacaoItem={observacaoItem} setObservacaoItem={setObservacaoItem}
          confirmarAdicionarItem={confirmarAdicionarItem} />
      )}
      {editandoItem && (
        <AjusteValorModal editandoItem={editandoItem} setEditandoItem={setEditandoItem} novoValor={novoValor}
          setNovoValor={setNovoValor} salvarEditarItem={salvarEditarItem} />
      )}
      {removendoItemId && (
        <AutorizacaoModal removendoItemId={removendoItemId} setRemovendoItemId={setRemovendoItemId} codigo={codigo}
          setCodigo={setCodigo} erroCodigo={erroCodigo} setErroCodigo={setErroCodigo} removerItem={removerItem} />
      )}
      <ComandaPrintView comanda={comanda} valorOriginalItem={valorOriginalItem} subtotalImpresso={subtotalImpresso} taxaImpressa={taxaImpressa} />
    </div>
  )
}
