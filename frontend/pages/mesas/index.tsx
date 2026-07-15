import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete, apiPatch, type Mesa } from '../../lib/api'

// Gerenciamento de mesas: cadastro, remoção e controle de status
export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [novoNumero, setNovoNumero] = useState('')
  const [erro, setErro] = useState('')

  // Carrega lista de mesas
  function carregar() { apiGet<Mesa[]>('/mesas').then(setMesas) }
  useEffect(() => { carregar() }, [])

  // Adiciona uma nova mesa com validação de número
  async function adicionar() {
    const numero = parseInt(novoNumero, 10)
    if (isNaN(numero) || numero <= 0) {
      setErro('Número da mesa deve ser um valor positivo')
      return
    }
    setErro('')
    try {
      await apiPost('/mesas', { numero })
      setNovoNumero(''); carregar()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao adicionar mesa'
      setErro(msg)
    }
  }

  // Alterna status da mesa entre LIVRE e OCUPADA
  async function toggleStatus(id: string) {
    await apiPatch(`/mesas/${id}/status`)
    carregar()
  }

  // Remove permanentemente uma mesa
  async function remover(id: string) {
    if (!confirm('Remover mesa?')) return
    await apiDelete(`/mesas/${id}`); carregar()
  }

  return (
    <div>
      <div className="page-header"><h2>Mesas</h2></div>

      <div className="card mb-4">
        <div className="flex gap-2" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Nova Mesa</label>
            <input type="text" inputMode="numeric" placeholder="Número" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (!/[\d]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') e.preventDefault() }} />
          </div>
          <button className="btn btn-primary" onClick={adicionar}>Adicionar</button>
        </div>
        {erro && <p style={{ color: '#dc3545', marginTop: '0.5rem' }}>{erro}</p>}
      </div>

      <div className="card-grid">
        {mesas.map((m) => {
          const ocupada = m.status === 'OCUPADA'
          return (
            <div key={m.id} className={`mesa-card ${ocupada ? 'mesa-ocupada' : 'mesa-livre'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`badge ${ocupada ? 'badge-ocupada' : 'badge-livre'}`}>
                    {ocupada ? '🔴 OCUPADA' : '🟢 LIVRE'}
                  </span>
                </div>
                <button className="mesa-btn-remover" onClick={() => remover(m.id)}>✕</button>
              </div>

              <div className="mesa-numero" style={{ marginTop: '0.75rem' }}>
                Mesa {m.numero}
              </div>

              <div className="mesa-info">
                <span className="mesa-info-texto">
                  {m._count.comandas > 0
                    ? `${m._count.comandas} comanda(s) em aberto`
                    : ocupada
                      ? 'Mesa ocupada'
                      : 'Mesa disponível'}
                </span>
              </div>

              <button
                className={`mesa-btn-toggle ${ocupada ? 'fechar' : 'abrir'}`}
                onClick={() => toggleStatus(m.id)}
              >
                {ocupada ? 'Fechar mesa' : 'Abrir mesa'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
