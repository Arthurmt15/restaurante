import { type GarcomRanking, type Comanda } from '../../lib/api'

/**
 * Props do componente de relatório individual de garçons.
 * Exibe ranking de vendas com checkboxes para seleção e detalhes expandíveis.
 */
interface GarconsRelatorioProps {
  /** Lista ordenada de garçons por total vendido (decrescente) */
  sorted: GarcomRanking[]
  /** Mapa de seleção por ID do garçom (true = selecionado) */
  selecionados: Record<string, boolean>
  /** ID do garçom com detalhes expandidos (null = nenhum) */
  expandido: string | null
  /** Comandas agrupadas por ID do garçom */
  comandasPorGarcom: Record<string, Comanda[]>
  /** Mapa de estados de carregamento por ID do garçom */
  carregando: Record<string, boolean>
  /** Função para marcar/desmarcar garçom para impressão */
  toggleSelecao: (id: string) => void
  /** Função para expandir/recolher detalhes de vendas */
  toggleExpandir: (id: string) => void
  /** Função para selecionar/desselecionar todos os garçons */
  toggleSelecionarTodos: () => void
  /** Indica se todos os garçons estão selecionados */
  todosSelecionados: boolean
}

/**
 * Componente de relatório individual de garçons.
 * Renderiza o ranking de vendas com controles de seleção para impressão
 * e painel expansível com detalhes de cada comanda.
 */
export default function GarconsRelatorio({
  sorted,
  selecionados,
  expandido,
  comandasPorGarcom,
  carregando,
  toggleSelecao,
  toggleExpandir,
  toggleSelecionarTodos,
  todosSelecionados,
}: GarconsRelatorioProps) {
  return (
    <div className="card mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3>Relatório Individual de Garçons</h3>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={toggleSelecionarTodos}>
            {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
        </div>
      </div>

      {sorted.map((v) => (
        <div key={v.id} className="card mb-2" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={!!selecionados[v.id]}
                onChange={() => toggleSelecao(v.id)}
              />
              <strong>{v.nome}</strong>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>
                {v.vendas} vendas | R$ {v.totalVendido.toFixed(2)}
              </span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => toggleExpandir(v.id)}
            >
              {expandido === v.id ? 'Recolher' : 'Detalhes'}
            </button>
          </div>

          {expandido === v.id && (
            <div className="mt-4">
              {carregando[v.id] ? (
                <p style={{ color: '#999' }}>Carregando...</p>
              ) : !comandasPorGarcom[v.id] || comandasPorGarcom[v.id].length === 0 ? (
                <p style={{ color: '#999' }}>Nenhuma venda encontrada</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Mesa</th><th>Itens</th><th>Subtotal</th><th>Taxa</th><th>Total</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {comandasPorGarcom[v.id].map((c) => (
                      <tr key={c.id}>
                        <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                        <td data-label="Itens">{c.itens.length}</td>
                        <td data-label="Subtotal">R$ {c.subtotal.toFixed(2)}</td>
                        <td data-label="Taxa">R$ {c.taxaServico.toFixed(2)}</td>
                        <td data-label="Total">R$ {c.total.toFixed(2)}</td>
                        <td data-label="Data" style={{ fontSize: '0.8rem' }}>
                          {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
