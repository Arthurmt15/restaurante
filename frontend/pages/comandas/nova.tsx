import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiPost, type Mesa, type Garcom } from '../../lib/api'

export default function NovaComanda() {
  const router = useRouter()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [mesaId, setMesaId] = useState('')
  const [garcomId, setGarcomId] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Mesa[]>('/mesas').then(setMesas)
    apiGet<Garcom[]>('/garcons').then(setGarcons)
  }, [])

  async function criar() {
    if (!mesaId) return
    setErro('')
    try {
      const c = await apiPost<{ id: string }>('/comandas', { mesaId, garcomId: garcomId || undefined })
      router.push(`/comandas/${c.id}`)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar comanda')
    }
  }

  return (
    <div>
      <div className="page-header"><h2>Nova Comanda</h2></div>

      <div className="card" style={{ maxWidth: 480 }}>
        {erro && <div className="badge badge-open mb-4">{erro}</div>}

        <div className="form-group">
          <label>Mesa</label>
          <select value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
            <option value="">Selecione...</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>Mesa {m.numero}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Garçom (opcional)</label>
          <select value={garcomId} onChange={(e) => setGarcomId(e.target.value)}>
            <option value="">Sem garçom</option>
            {garcons.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary mt-2" onClick={criar} disabled={!mesaId}>
          Criar Comanda
        </button>
      </div>
    </div>
  )
}
