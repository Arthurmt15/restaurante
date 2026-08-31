import { type Comanda, type ItemComanda } from '../../lib/api'

/** Props da versão para impressão da comanda. */
interface ComandaPrintViewProps {
  comanda: Comanda
  valorOriginalItem: (i: ItemComanda) => number
  subtotalImpresso: number
  taxaImpressa: number
}

/**
 * Versão para impressão da comanda.
 * Renderiza apenas durante a impressão (controlado pela classe CSS print-only).
 * Exibe cabeçalho, itens, totais e pagamentos no formato adequado para impressão.
 */
export default function ComandaPrintView({
  comanda, valorOriginalItem, subtotalImpresso, taxaImpressa,
}: ComandaPrintViewProps) {
  return (
    <div className="print-only">
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>Barraca da Vânia</div>
        <div style={{ fontSize: '8pt', color: '#555' }}>Comanda #{comanda.id.slice(0, 8).toUpperCase()}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2mm 0', marginBottom: '2mm', fontSize: '9pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Mesa: {comanda.mesa.numero}</span>
          <span>{comanda.status}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Garçom: {comanda.garcom?.nome || '—'}</span>
          <span>{new Date(comanda.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2mm' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', padding: '1mm 0', fontSize: '8pt' }}>Item</th>
            <th style={{ textAlign: 'center', padding: '1mm 0', fontSize: '8pt' }}>Qtd</th>
            <th style={{ textAlign: 'right', padding: '1mm 0', fontSize: '8pt' }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {comanda.itens.map((i) => (
            <tr key={i.id}>
              <td style={{ padding: '1mm 0', fontSize: '9pt' }}>
                {i.item.nome}
                {i.observacao && <div style={{ fontSize: '7pt', color: '#555' }}>{i.observacao}</div>}
              </td>
              <td style={{ textAlign: 'center', padding: '1mm 0', fontSize: '9pt' }}>{i.quantidade}</td>
              <td style={{ textAlign: 'right', padding: '1mm 0', fontSize: '9pt' }}>R$ {valorOriginalItem(i).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '2mm', fontSize: '9pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span>
          <span>R$ {subtotalImpresso.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Taxa de Serviço (10%)</span>
          <span>R$ {taxaImpressa.toFixed(2)}</span>
        </div>
        {comanda.desconto && comanda.desconto > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Desconto</span>
            <span>- R$ {comanda.desconto.toFixed(2)}</span>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 700, marginTop: '1mm', borderTop: '1px dashed #000', paddingTop: '1mm' }}>
          <span>Total</span>
          <span>R$ {comanda.total.toFixed(2)}</span>
        </div>
        {comanda.pagamentos && comanda.pagamentos.length > 0 && (
          <div style={{ marginTop: '2mm', fontSize: '8pt', borderTop: '1px dotted #ccc', paddingTop: '1mm' }}>
            {comanda.pagamentos.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.forma}</span>
                <span>R$ {p.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '3mm', fontSize: '7pt', color: '#555' }}>
        {new Date(comanda.createdAt).toLocaleString('pt-BR')}
      </div>
    </div>
  )
}
