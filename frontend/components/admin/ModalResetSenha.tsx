import { useState } from 'react'
import { apiPost, type UsuarioAdmin } from '../../lib/api'

interface ModalResetSenhaProps {
  usuario: UsuarioAdmin
  onClose: () => void
}

export default function ModalResetSenha({ usuario, onClose }: ModalResetSenhaProps) {
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await apiPost(`/admin/usuarios/${usuario.id}/reset-senha`, { novaSenha })
      setSucesso(true)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Redefinir Senha</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: 16 }}>
            Redefinindo senha de <strong style={{ color: '#fff' }}>{usuario.nome}</strong>.<br />
            Todas as sessões ativas serão encerradas.
          </p>
          {sucesso ? (
            <div className="form-success">✅ Senha redefinida com sucesso! Todas as sessões foram encerradas.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {erro && <div className="form-error">{erro}</div>}
              <div className="form-field">
                <label htmlFor="reset-nova-senha">Nova Senha</label>
                <input id="reset-nova-senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
                <button type="submit" className="btn-danger" disabled={enviando || novaSenha.length < 8}>
                  {enviando ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          )}
          {sucesso && (
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
