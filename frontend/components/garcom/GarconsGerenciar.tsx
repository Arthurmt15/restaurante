import { type Garcom } from '../../lib/api'

/**
 * Props do componente de gerenciamento de garçons.
 * Exibe tabela com lista de garçons, controles de edição e ações.
 */
interface GarconsGerenciarProps {
  /** Lista completa de garçons (incluindo inativos) */
  garcons: Garcom[]
  /** Garçom sendo editado (null = nenhum) */
  editando: Garcom | null
  /** Define o garçom em modo de edição */
  setEditando: (garcom: Garcom | null) => void
  /** Função para salvar alteração no nome do garçom */
  atualizar: () => void
  /** Função para desativar um garçom */
  remover: (id: string) => void
  /** Função para reativar um garçom desativado */
  reativar: (id: string) => void
  /** Função para abrir o modal de acesso de um garçom */
  abrirModalAcesso: (garcom: Garcom) => void
}

/**
 * Componente de gerenciamento de garçons.
 * Renderiza tabela com todos os garçons, permitindo edição, ativação/desativação
 * e configuração de acessos ao sistema.
 */
export default function GarconsGerenciar({
  garcons,
  editando,
  setEditando,
  atualizar,
  remover,
  reativar,
  abrirModalAcesso,
}: GarconsGerenciarProps) {
  return (
    <div className="card">
      <h3 className="mb-4">Gerenciar Garçons</h3>
      <table>
        <thead><tr><th>Nome</th><th>Acesso</th><th>Ações</th></tr></thead>
        <tbody>
          {[...garcons].sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1)).map((g) => (
                <tr key={g.id} style={g.ativo ? {} : { opacity: 0.6 }}>
              {editando?.id === g.id ? (
                <>
                  <td data-label="Nome"><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #d5d7da', borderRadius: '7px', fontSize: '0.9rem', width: '100%', outline: 'none', transition: 'border-color 0.2s', fontFamily: "'DM Sans', sans-serif" }} onFocus={(e) => e.target.style.borderColor = '#c9953f'} onBlur={(e) => e.target.style.borderColor = '#d5d7da'} /></td>
                  <td data-label="Acesso"></td>
                  <td data-label="Ações">
                    <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                      <button className="btn btn-success btn-sm" onClick={atualizar}>Salvar</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td data-label="Nome">
                    {g.nome}
                    {!g.ativo && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.8rem' }}>(Inativo)</span>}
                  </td>
                  <td data-label="Acesso">
                    {g.usuarioId ? (
                      <span style={{ color: '#2d8a4e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Vinculado
                      </span>
                    ) : (
                      g.ativo && <button className="btn btn-outline btn-sm" onClick={() => abrirModalAcesso(g)}>🔑 Criar Acesso</button>
                    )}
                  </td>
                  <td data-label="Ações">
                    <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...g })}>Editar</button>
                      {g.ativo ? (
                        <button className="btn btn-danger btn-sm" onClick={() => remover(g.id)}>X</button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => reativar(g.id)}>Reativar</button>
                      )}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
