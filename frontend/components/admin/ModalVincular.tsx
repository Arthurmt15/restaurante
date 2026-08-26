import { useState } from 'react'
import type { UsuarioAdmin } from '../../lib/api'

interface ModalVincularProps {
  usuario: UsuarioAdmin
  onClose: () => void
  onVincular: (targetTenantId: string) => void
}

export default function ModalVincular({ usuario, onClose, onVincular }: ModalVincularProps) {
  const [targetId, setTargetId] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId.trim()) return
    setEnviando(true)
    setErro('')
    try {
      onVincular(targetId.trim())
    } catch {
      setErro('Erro ao vincular ambiente')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Vincular Ambiente</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: 16 }}>
            Vinculando <strong style={{ color: '#fff' }}>{usuario.nome}</strong> ao ambiente de outro usuário.
          </p>
          {usuario.tenantId && usuario.tenantId !== usuario.id && (
            <p style={{ color: '#fd7e14', fontSize: '0.8rem', marginBottom: 12 }}>
              Atualmente compartilha o ambiente <code>{usuario.tenantId.slice(0, 8)}…</code>
            </p>
          )}
          <form onSubmit={handleSubmit}>
            {erro && <div className="form-error">{erro}</div>}
            <div className="form-field">
              <label htmlFor="vincular-target">ID do usuário dono do ambiente</label>
              <input
                id="vincular-target"
                type="text"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                required
                placeholder="Cole o ID do usuário-alvo"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={enviando || !targetId.trim()}>
                {enviando ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
