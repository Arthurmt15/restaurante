import { useEffect, useState } from 'react'
import { apiGet, type RelatorioVendas, type GarcomComparativo } from '../../lib/api'

type ComparativoMensal = {
  ano: number
  dados: { mes: string; nomeMes: string; comandas: number; subtotal: number; taxa: number; total: number }[]
  totalAnual: { comandas: number; subtotal: number; taxa: number; total: number }
}

export default function RelatoriosPage() {
  const now = new Date()
  const [periodo, setPeriodo] = useState('diario')
  const [mesSelecionado, setMesSelecionado] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [anoSelecionado, setAnoSelecionado] = useState(String(now.getFullYear()))
  const [relatorio, setRelatorio] = useState<RelatorioVendas | null>(null)
  const [comparativo, setComparativo] = useState<GarcomComparativo[]>([])
  const [comparativoMensal, setComparativoMensal] = useState<ComparativoMensal | null>(null)
  const [carregando, setCarregando] = useState(false)

  function imprimirRelatorio() {
    const dados = periodo === 'anual' ? comparativoMensal : relatorio
    if (!dados) return
    const tituloPeriodo = periodo === 'diario' ? 'Diário' : periodo === 'semanal' ? 'Semanal' : periodo === 'mensal' ? 'Mensal' : periodo === 'mes' ? `${new Date(2000, parseInt(mesSelecionado) - 1).toLocaleString('pt-BR', { month: 'long' })}/${anoSelecionado}` : `${anoSelecionado}`
    const hoje = new Date().toLocaleString('pt-BR')

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório ${tituloPeriodo}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 10pt; padding: 3mm; color: #000; }
  .header { text-align: center; margin-bottom: 3mm; }
  .header h1 { font-size: 14pt; }
  .header p { font-size: 8pt; color: #555; }
  .divider { border-top: 1px dashed #000; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { padding: 0.5mm 1mm; text-align: left; }
  th { border-bottom: 1px solid #000; font-size: 8pt; }
  td { border-bottom: 1px dotted #ccc; }
  .total-row { font-weight: 700; font-size: 11pt; text-align: right; }
  .resumo { margin-top: 3mm; }
  .resumo-item { display: flex; justify-content: space-between; font-size: 9pt; padding: 0.5mm 0; }
  .footer { text-align: center; font-size: 7pt; color: #999; margin-top: 3mm; }
</style></head><body>
<div class="header">
  <h1>Barraca da Vânia</h1>
  <p>Relatório ${tituloPeriodo}</p>
  <p>${hoje}</p>
</div>
<div class="divider"></div>`

    if (periodo !== 'anual') {
      const r = relatorio!
      html += `
<div class="resumo">
  <div class="resumo-item"><span>Comandas</span><span>${r.totalComandas}</span></div>
  <div class="resumo-item"><span>Subtotal</span><span>R$ ${r.totalSubtotal.toFixed(2)}</span></div>
  <div class="resumo-item"><span>Taxa de Serviço</span><span>R$ ${r.totalTaxa.toFixed(2)}</span></div>
  <div class="resumo-item" style="font-weight:700;font-size:11pt"><span>Total</span><span>R$ ${r.totalVendas.toFixed(2)}</span></div>
</div>
<div class="divider"></div>`
      if (r.comandas.length > 0) {
        html += `<table><thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th></tr></thead><tbody>`
        r.comandas.forEach((c) => {
          html += `<tr><td>Mesa ${c.mesa.numero}</td><td>${c.garcom?.nome || '—'}</td><td>${c.itens.length}</td><td>R$ ${c.total.toFixed(2)}</td></tr>`
        })
        html += `</tbody></table>`
      }
    } else {
      const c = comparativoMensal!
      html += `
<div class="resumo">
  <div class="resumo-item"><span>Comandas (Ano)</span><span>${c.totalAnual.comandas}</span></div>
  <div class="resumo-item"><span>Subtotal (Ano)</span><span>R$ ${c.totalAnual.subtotal.toFixed(2)}</span></div>
  <div class="resumo-item"><span>Taxa (Ano)</span><span>R$ ${c.totalAnual.taxa.toFixed(2)}</span></div>
  <div class="resumo-item" style="font-weight:700;font-size:11pt"><span>Total (Ano)</span><span>R$ ${c.totalAnual.total.toFixed(2)}</span></div>
</div>
<div class="divider"></div>
<table><thead><tr><th>Mês</th><th>Com.</th><th>Subtotal</th><th>Taxa</th><th>Total</th></tr></thead><tbody>`
      c.dados.forEach((d) => {
        html += `<tr><td>${d.nomeMes}</td><td>${d.comandas}</td><td>R$ ${d.subtotal.toFixed(2)}</td><td>R$ ${d.taxa.toFixed(2)}</td><td>R$ ${d.total.toFixed(2)}</td></tr>`
      })
      html += `</tbody></table>`
    }

    html += `<div class="footer">Relatório gerado em ${hoje}</div></body></html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.onload = () => { w.print(); w.close() }
    }
  }

  useEffect(() => {
    setCarregando(true)
    if (periodo === 'mes') {
      apiGet<RelatorioVendas>(`/relatorios/vendas?mes=${mesSelecionado}&ano=${anoSelecionado}`).then((r) => {
        setRelatorio(r)
        setCarregando(false)
      })
    } else if (periodo === 'anual') {
      apiGet<ComparativoMensal>(`/relatorios/comparativo-mensal?ano=${anoSelecionado}`).then((r) => {
        setComparativoMensal(r)
        setCarregando(false)
      })
    } else {
      apiGet<RelatorioVendas>(`/relatorios/vendas?periodo=${periodo}`).then((r) => {
        setRelatorio(r)
        setCarregando(false)
      })
    }
    apiGet<GarcomComparativo[]>('/relatorios/garcons/comparativo').then(setComparativo)
  }, [periodo, mesSelecionado, anoSelecionado])

  const anos = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))

  return (
    <div>
      <div className="page-header">
        <h2>Relatórios</h2>
        <button className="btn btn-primary no-print" onClick={imprimirRelatorio}>Imprimir</button>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4">Vendas por Período</h3>
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          {['diario', 'semanal', 'mensal', 'mes', 'anual'].map((p) => (
            <button
              key={p}
              className={`btn ${periodo === p ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPeriodo(p)}
            >
              {p === 'diario' ? 'Diário' : p === 'semanal' ? 'Semanal' : p === 'mensal' ? 'Mensal' : p === 'mes' ? 'Mês Específico' : 'Anual'}
            </button>
          ))}
        </div>

        {periodo === 'mes' && (
          <div className="flex gap-2 mb-4" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label>Mês</label>
              <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => {
                  const v = String(i + 1).padStart(2, '0')
                  const nome = new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })
                  return <option key={v} value={v}>{nome}</option>
                })}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 100 }}>
              <label>Ano</label>
              <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        {periodo === 'anual' && (
          <div className="flex gap-2 mb-4" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: 100 }}>
              <label>Ano</label>
              <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className={`periodo-content ${carregando && (relatorio || comparativoMensal) ? 'periodo-loading' : ''}`}>
          {periodo !== 'anual' && relatorio && (
            <div className="card-grid mb-4">
              <div className="card">
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Comandas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{relatorio.totalComandas}</p>
              </div>
              <div className="card">
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Subtotal</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {relatorio.totalSubtotal.toFixed(2)}</p>
              </div>
              <div className="card">
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Taxa de Serviço</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a73e8' }}>R$ {relatorio.totalTaxa.toFixed(2)}</p>
              </div>
              <div className="card">
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Total</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {relatorio.totalVendas.toFixed(2)}</p>
              </div>
            </div>
          )}

          {periodo === 'anual' && comparativoMensal && (
            <>
              <div className="card-grid mb-4">
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Comandas (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{comparativoMensal.totalAnual.comandas}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Subtotal (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {comparativoMensal.totalAnual.subtotal.toFixed(2)}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Taxa de Serviço (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a73e8' }}>R$ {comparativoMensal.totalAnual.taxa.toFixed(2)}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Total (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {comparativoMensal.totalAnual.total.toFixed(2)}</p>
                </div>
              </div>

              <table>
                <thead><tr><th>Mês</th><th>Comandas</th><th>Subtotal</th><th>Taxa</th><th>Total</th></tr></thead>
                <tbody>
                  {comparativoMensal.dados.map((d) => (
                    <tr key={d.mes}>
                      <td data-label="Mês" style={{ textTransform: 'capitalize' }}>{d.nomeMes}</td>
                      <td data-label="Comandas">{d.comandas}</td>
                      <td data-label="Subtotal">R$ {d.subtotal.toFixed(2)}</td>
                      <td data-label="Taxa">R$ {d.taxa.toFixed(2)}</td>
                      <td data-label="Total">R$ {d.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {periodo !== 'anual' && relatorio && relatorio.comandas.length > 0 && (
            <table>
              <thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th><th>Data</th></tr></thead>
              <tbody>
                {relatorio.comandas.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                    <td data-label="Garçom">{c.garcom?.nome || '—'}</td>
                    <td data-label="Itens">{c.itens.length}</td>
                    <td data-label="Total">R$ {c.total.toFixed(2)}</td>
                    <td data-label="Data" style={{ fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Comparativo de Vendas por Garçom (por Mês)</h3>
        {comparativo.length === 0 ? (
          <div className="empty-state">Nenhum dado disponível</div>
        ) : (
          comparativo.map((g) => (
            <div key={g.id} className="mb-4">
              <h4 className="mb-2">{g.nome} — Total: R$ {g.totalVendido.toFixed(2)}</h4>
              <table>
                <thead><tr><th>Mês</th><th>Vendas</th><th>Total</th><th>Taxa</th></tr></thead>
                <tbody>
                  {g.meses.map((m) => {
                    const [ano, mes] = m.mes.split('-')
                    const nomeMes = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleString('pt-BR', { month: 'long' })
                    return (
                      <tr key={m.mes}>
                        <td data-label="Mês" style={{ textTransform: 'capitalize' }}>{nomeMes}/{ano}</td>
                        <td data-label="Vendas">{m.vendas}</td>
                        <td data-label="Total">R$ {m.total.toFixed(2)}</td>
                        <td data-label="Taxa">R$ {m.taxa.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
