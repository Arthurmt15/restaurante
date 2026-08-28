import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiPost, apiDelete, apiPatch, type Mesa } from '../../lib/api'
import Tooltip from '../../components/Tooltip'

type ViewMode = 'lista' | 'mapa'

type MesaPosition = { col: number; row: number }

const GRID_COLS = 10
const GRID_ROWS = 8

function loadPositions(): Record<string, MesaPosition> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('mesaPositions') || '{}')
  } catch { return {} }
}

function savePositions(positions: Record<string, MesaPosition>) {
  localStorage.setItem('mesaPositions', JSON.stringify(positions))
}

function getDefaultPosition(mesaNumero: number, existingPositions: Record<string, MesaPosition>): MesaPosition {
  const used = new Set(Object.values(existingPositions).map(p => `${p.col},${p.row}`))
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!used.has(`${c},${r}`)) return { col: c, row: r }
    }
  }
  return { col: mesaNumero % GRID_COLS, row: Math.floor(mesaNumero / GRID_COLS) }
}

export default function MesasPage() {
  const router = useRouter()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [novoNumero, setNovoNumero] = useState('')
  const [erro, setErro] = useState('')
  const [erroRemover, setErroRemover] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('lista')
  const [positions, setPositions] = useState<Record<string, MesaPosition>>({})
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  function carregar() { apiGet<Mesa[]>('/mesas').then(setMesas) }
  useEffect(() => { carregar() }, [])
  useEffect(() => { setPositions(loadPositions()) }, [])

  const persistPositions = useCallback((pos: Record<string, MesaPosition>) => {
    setPositions(pos)
    savePositions(pos)
  }, [])

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

  async function toggleStatus(id: string) {
    await apiPatch(`/mesas/${id}/status`)
    carregar()
  }

  async function remover(m: Mesa) {
    if (m.status === 'OCUPADA') {
      setErroRemover(`Mesa ${m.numero} está ocupada — feche antes de excluir`)
      setTimeout(() => setErroRemover(''), 10000)
      return
    }
    if (!confirm(`Remover Mesa ${m.numero}?`)) return
    try {
      await apiDelete(`/mesas/${m.id}`)
      const next = { ...positions }
      delete next[m.id]
      persistPositions(next)
      carregar()
    } catch {
      setErroRemover(`Erro ao remover Mesa ${m.numero}`)
      setTimeout(() => setErroRemover(''), 3000)
    }
  }

  function handleMesaClick(m: Mesa) {
    if (m.status === 'OCUPADA' && m._count.comandas > 0) {
      apiGet<{ comandas: { id: string }[] }>(`/comandas?mesaId=${m.id}&status=ABERTA`)
        .then((r) => {
          if (r.comandas.length > 0) router.push(`/comandas/${r.comandas[0].id}`)
          else router.push(`/comandas/nova?mesa=${m.id}`)
        })
        .catch(() => router.push(`/comandas/nova?mesa=${m.id}`))
    } else {
      router.push(`/comandas/nova?mesa=${m.id}`)
    }
  }

  // Drag & drop for map
  function handleDragStart(e: React.DragEvent, mesaId: string) {
    e.dataTransfer.setData('text/plain', mesaId)
    setDragging(mesaId)
  }

  function handleDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCell(cellKey)
  }

  function handleDrop(e: React.DragEvent, col: number, row: number) {
    e.preventDefault()
    const mesaId = e.dataTransfer.getData('text/plain')
    if (!mesaId) return
    const next = { ...positions, [mesaId]: { col, row } }
    persistPositions(next)
    setDragging(null)
    setDragOverCell(null)
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOverCell(null)
  }

  function ajustarPosicoes() {
    const next = { ...positions }
    mesas.forEach(m => {
      if (!next[m.id]) next[m.id] = getDefaultPosition(m.numero, next)
    })
    persistPositions(next)
  }

  useEffect(() => { if (viewMode === 'mapa' && mesas.length > 0) ajustarPosicoes() }, [viewMode, mesas])

  const gridCells = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => `${c},${r}`)
  )

  return (
    <div>
      <div className="page-header">
        <h2>Mesas</h2>
        <div className="flex gap-2">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'lista' ? 'view-toggle-active' : ''}`}
              onClick={() => setViewMode('lista')}
            >Lista</button>
            <button
              className={`view-toggle-btn ${viewMode === 'mapa' ? 'view-toggle-active' : ''}`}
              onClick={() => setViewMode('mapa')}
            >Mapa</button>
          </div>
          <button className="btn btn-primary" onClick={() => setViewMode(v => v === 'lista' ? 'mapa' : 'lista')} style={{ display: 'none' }} />
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-2" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Nova Mesa</label>
            <input type="text" inputMode="numeric" placeholder="Número" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }} />
          </div>
          <button className="btn btn-primary" onClick={adicionar}>Adicionar</button>
        </div>
        {erro && <p style={{ color: '#dc3545', marginTop: '0.5rem' }}>{erro}</p>}
      </div>

      {erroRemover && (
        <div className="card mb-4" style={{ border: '2px solid #dc3545', padding: '0.75rem 1rem' }}>
          <p style={{ color: '#dc3545', margin: 0, fontSize: '0.9rem' }}>{erroRemover}</p>
        </div>
      )}

      {viewMode === 'lista' ? (
        <div className="card-grid">
          {mesas.map((m) => {
            const ocupada = m.status === 'OCUPADA'
            return (
              <div key={m.id} className={`mesa-card ${ocupada ? 'mesa-ocupada' : 'mesa-livre'}`}>
                <div className="flex justify-between items-start">
                  <span className={`badge ${ocupada ? 'badge-ocupada' : 'badge-livre'}`}>
                    {ocupada ? 'OCUPADA' : 'LIVRE'}
                  </span>
                  <Tooltip text={ocupada ? 'Feche a mesa antes de remover' : 'Remover mesa'}>
                    <button className="mesa-btn-remover" onClick={() => remover(m)} style={ocupada ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>✕</button>
                  </Tooltip>
                </div>
                <div className="mesa-numero" style={{ marginTop: '0.75rem' }}>Mesa {m.numero}</div>
                <div className="mesa-info">
                  <span className="mesa-info-texto">
                    {m._count.comandas > 0
                      ? `${m._count.comandas} comanda(s) em aberto`
                      : ocupada ? 'Mesa ocupada' : 'Mesa disponível'}
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
      ) : (
        <div className="mesa-map-controls">
          <div className="flex gap-2 items-center mb-4">
            <button className="btn btn-outline btn-sm" onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}>−</button>
            <span style={{ fontSize: '0.8rem', color: '#666', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="btn btn-outline btn-sm" onClick={() => setZoom(z => Math.min(2, z + 0.15))}>+</button>
            <button className="btn btn-outline btn-sm" onClick={() => setZoom(1)}>Reset</button>
            <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.5rem' }}>Arraste para reposicionar</span>
          </div>
          <div className="mesa-map-container">
            <div
              ref={gridRef}
              className="mesa-map-grid"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              {gridCells.map((row, r) =>
                row.map((cellKey, c) => {
                  const mesaAtCell = mesas.find(m => {
                    const pos = positions[m.id]
                    return pos && pos.col === c && pos.row === r
                  })
                  const isDragOver = dragOverCell === cellKey && !mesaAtCell
                  return (
                    <div
                      key={cellKey}
                      className={`mesa-map-cell ${isDragOver ? 'mesa-map-cell-hover' : ''} ${mesaAtCell ? 'mesa-map-cell-occupied' : ''}`}
                      onDragOver={(e) => handleDragOver(e, cellKey)}
                      onDrop={(e) => handleDrop(e, c, r)}
                    >
                      {mesaAtCell && (
                        <div
                          className={`mesa-map-table ${mesaAtCell.status === 'OCUPADA' ? 'mesa-map-ocupada' : 'mesa-map-livre'} ${dragging === mesaAtCell.id ? 'mesa-map-dragging' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, mesaAtCell.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleMesaClick(mesaAtCell)}
                          title={`Mesa ${mesaAtCell.numero} — ${mesaAtCell.status}`}
                        >
                          <span className="mesa-map-numero">{mesaAtCell.numero}</span>
                          <span className={`mesa-map-status ${mesaAtCell.status === 'OCUPADA' ? 'mesa-map-status-ocupada' : 'mesa-map-status-livre'}`}>
                            {mesaAtCell.status === 'OCUPADA' ? 'OCUPADA' : 'LIVRE'}
                          </span>
                          {mesaAtCell._count.comandas > 0 && (
                            <span className="mesa-map-comandas">{mesaAtCell._count.comandas} cmd</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
