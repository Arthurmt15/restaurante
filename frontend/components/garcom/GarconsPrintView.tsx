import { type GarcomRanking, type Comanda } from '../../lib/api'

/**
 * Props do componente de impressão do relatório de garçons.
 * Renderiza a versão para impressão com detalhes de cada comanda por garçom.
 */
interface GarconsPrintViewProps {
  /** Lista de garçons selecionados para impressão */
  selecionadosLista: GarcomRanking[]
  /** Comandas agrupadas por ID do garçom */
  comandasPorGarcom: Record<string, Comanda[]>
  /** Data atual formatada em pt-BR */
  hoje: string
}

/**
 * Componente de impressão do relatório de garçons.
 * Exibe apenas durante a impressão (print-only) com layout otimizado para papel.
 * Inclui cabeçalho do restaurante, detalhes por garçom e resumo geral.
 */
export default function GarconsPrintView({
  selecionadosLista,
  comandasPorGarcom,
  hoje,
}: GarconsPrintViewProps) {
  return (
    <div className="print-only">
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>Barraca da Vânia</div>
        <div style={{ fontSize: '8pt', color: '#555' }}>Relatório Individual de Garçons — {hoje}</div>
      </div>

      {selecionadosLista.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
          Selecione ao menos um garçom para imprimir.
        </p>
      ) : (
        selecionadosLista.map((v, idx) => {
          const comandas = comandasPorGarcom[v.id] || []
          const totalGeral = comandas.reduce((a, c) => a + c.total, 0)
          const totalTaxas = comandas.reduce((a, c) => a + c.taxaServico, 0)

          return (
            <div key={v.id} style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto', marginBottom: '4mm' }}>
              <div style={{ fontSize: '12pt', fontWeight: 700, borderBottom: '1px dashed #000', paddingBottom: '1mm', marginBottom: '2mm' }}>
                {v.nome}
                <span style={{ fontSize: '8pt', fontWeight: 'normal', color: '#555', marginLeft: '2mm' }}>
                  Total: R$ {totalGeral.toFixed(2)} | Taxas: R$ {totalTaxas.toFixed(2)} | Vendas: {comandas.length}
                </span>
              </div>

              {comandas.length === 0 ? (
                <p style={{ color: '#999', fontSize: '8pt' }}>Nenhuma venda registrada</p>
              ) : (
                comandas.map((c) => (
                  <div key={c.id} style={{ marginBottom: '3mm' }}>
                    <div style={{ fontSize: '8pt', borderBottom: '1px dotted #ccc', paddingBottom: '1mm', marginBottom: '1mm', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mesa {c.mesa.numero}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')} {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {c.itens.map((i) => (
                      <div key={i.id} style={{ fontSize: '8pt', padding: '0.5mm 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {i.item.nome}
                          {i.observacao && <span style={{ color: '#555' }}> ({i.observacao})</span>}
                        </span>
                        <span>{i.quantidade}x R$ {i.precoUnit.toFixed(2)}</span>
                      </div>
                    ))}

                    <div style={{ fontSize: '7pt', display: 'flex', justifyContent: 'space-between', paddingLeft: '2mm', marginTop: '0.5mm' }}>
                      <span>Subtotal: R$ {c.subtotal.toFixed(2)} | Taxa: R$ {c.taxaServico.toFixed(2)}</span>
                      <span style={{ fontWeight: 700 }}>Total: R$ {c.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}

              <div style={{ textAlign: 'right', fontSize: '9pt', borderTop: '1px dashed #000', paddingTop: '1mm' }}>
                <div>Taxas: R$ {totalTaxas.toFixed(2)}</div>
                <div style={{ fontWeight: 700, fontSize: '10pt' }}>Total: R$ {totalGeral.toFixed(2)}</div>
              </div>
            </div>
          )
        })
      )}

      {selecionadosLista.length > 1 && (
        <div style={{ marginTop: '3mm', paddingTop: '1mm', borderTop: '1px dashed #000', fontSize: '8pt' }}>
          <div style={{ fontWeight: 700, marginBottom: '1mm' }}>Resumo Geral</div>
          {selecionadosLista.map((v) => {
            const comandas = comandasPorGarcom[v.id] || []
            return (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{v.nome}: {comandas.length} vendas</span>
                <span>R$ {comandas.reduce((a, c) => a + c.total, 0).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
