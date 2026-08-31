/**
 * Modal de confirmação de logout.
 *
 * Exibe um diálogo modal pedindo confirmação ao usuário antes de
 * encerrar a sessão do sistema. Inclui animação de entrada e
 * suporte a fechamento clicando fora do modal.
 */

/** Props do componente de logout */
export interface LogoutModalProps {
  /** Controla a visibilidade do modal */
  show: boolean
  /** Callback chamado ao fechar o modal sem confirmar */
  onClose: () => void
  /** Callback chamado ao confirmar o logout */
  onConfirm: () => void
}

/**
 * Modal de confirmação de logout.
 *
 * @param show - Se `true`, exibe o modal na tela.
 * @param onClose - Função chamada ao clicar em "Cancelar" ou no overlay.
 * @param onConfirm - Função chamada ao clicar em "Sim, sair".
 */
export default function LogoutModal({ show, onClose, onConfirm }: LogoutModalProps) {
  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          textAlign: 'center',
          animation: 'logoutModalIn 0.2s ease-out',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👋</div>
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '1.25rem',
            color: '#171b22',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Sair do Sistema
        </h3>
        <p
          style={{
            margin: '0 0 24px 0',
            color: '#777d87',
            fontSize: '0.95rem',
            lineHeight: '1.5',
          }}
        >
          Tem certeza que deseja sair do sistema e encerrar a sua sessão atual?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '7px',
              border: '1px solid #d5d7da',
              background: 'transparent',
              color: '#171b22',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '7px',
              border: 'none',
              background: '#dc3545',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sim, sair
          </button>
        </div>
      </div>
      <style>{`
        @keyframes logoutModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
