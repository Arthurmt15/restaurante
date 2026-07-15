import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete, type Mesa } from '../../lib/api'

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [novoNumero, setNovoNumero] = useState('')
  const [erro, setErro] = useState('')

  function carregar() { apiGet<Mesa[]>('/mesas').then(setMesas) }
  useEffect(() => { carregar() }, [])

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
        {mesas.map((m) => (
          <div className="card" key={m.id}>
            <div className="flex justify-between items-center">
              <div>
                <h3>Mesa {m.numero}</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  {m._count.comandas > 0 ? `${m._count.comandas} comanda(s)` : 'Livre'}
                </p>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remover(m.id)}>X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
