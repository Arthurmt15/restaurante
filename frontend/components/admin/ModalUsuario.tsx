import { useState } from 'react'
import { apiPost, apiPatch, type UsuarioAdmin } from '../../lib/api'

interface ModalUsuarioProps {
  usuario?: UsuarioAdmin | null
  onClose: () => void
  onSalvo: () => void
}

export default function ModalUsuario({ usuario, onClose, onSalvo }: ModalUsuarioProps) {
  const isEdicao = !!usuario
  const [nome, setNome] = useState(usuario?.nome || '')
  const [email, setEmail] = useState(usuario?.email || '')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<'SUPERADMIN' | 'CLIENTE' | 'GARCOM'>(usuario?.role as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM' || 'CLIENTE')
  const [tenantId, setTenantId] = useState(usuario?.tenantId || '')
  const [status, setStatus] = useState<'ATIVO' | 'SUSPENSO' | 'INADIMPLENTE'>(usuario?.status || 'ATIVO')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    try {
      if (isEdicao) {
        await apiPatch<UsuarioAdmin>(`/admin/usuarios/${usuario!.id}`, { nome, email, role, status })
      } else {
        await apiPost<UsuarioAdmin>('/admin/usuarios', {
          nome, email, senha, role, status,
          ...(role === 'GARCOM' && tenantId ? { tenantId } : {}),
        })
      }
      onSalvo()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h3 id="modal-title">{isEdicao ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {erro && <div className="form-error">{erro}</div>}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-nome">Nome *</label>
              <input id="modal-nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required minLength={2} placeholder="Nome completo" />
            </div>
            <div className="form-field">
              <label htmlFor="modal-email">Email *</label>
              <input id="modal-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@exemplo.com" />
            </div>
          </div>

          {!isEdicao && (
            <div className="form-field">
              <label htmlFor="modal-senha">Senha *</label>
              <input id="modal-senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-role">Cargo</label>
              <select id="modal-role" value={role} onChange={e => setRole(e.target.value as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM')}>
                <option value="CLIENTE">👤 Cliente</option>
                <option value="GARCOM">🍽️ Garçom</option>
                <option value="SUPERADMIN">👑 Superadmin</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="modal-status">Status</label>
              <select id="modal-status" value={status} onChange={e => setStatus(e.target.value as 'ATIVO' | 'SUSPENSO' | 'INADIMPLENTE')}>
                <option value="ATIVO">Ativo</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="INADIMPLENTE">Inadimplente</option>
              </select>
            </div>
          </div>

          {!isEdicao && role === 'GARCOM' && (
            <div className="form-field">
              <label htmlFor="modal-tenant">Tenant ID do Restaurante <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8em' }}>(opcional)</span></label>
              <input
                id="modal-tenant"
                type="text"
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                placeholder="ID do cliente/restaurante ao qual pertence"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : isEdicao ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
