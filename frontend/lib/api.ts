const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `POST ${path} failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
}

export type Mesa = { id: string; numero: number; _count: { comandas: number } }
export type Garcom = { id: string; nome: string; telefone?: string; ativo: boolean }
export type Categoria = { id: string; nome: string; itens: ItemCardapio[] }
export type CategoriaInfo = { id: string; nome: string }
export type ItemCardapio = { id: string; nome: string; nomeEn?: string; descricao?: string; preco: number; porcaoTamanho?: string; observacao?: string; categoriaId: string; categoria?: CategoriaInfo; ativo: boolean; estoqueAtual: number; estoqueMinimo: number }
export type Comanda = {
  id: string; mesaId: string; garcomId?: string; status: string
  subtotal: number; taxaServico: number; total: number
  mesa: Mesa; garcom?: Garcom
  itens: ItemComanda[]
  createdAt: string
  updatedAt?: string
}
export type ItemComanda = {
  id: string; comandaId: string; itemId: string
  quantidade: number; precoUnit: number; observacao?: string
  item: ItemCardapio & { categoria: Categoria }
}
export type RelatorioVendas = {
  periodo: string; totalComandas: number; totalSubtotal: number
  totalTaxa: number; totalVendas: number; mediaPorComanda: number
  comandas: Comanda[]
}
export type GarcomRanking = {
  id: string; nome: string; vendas: number; totalVendido: number; totalTaxa: number
}
export type MovimentoEstoque = {
  id: string; itemId: string; tipo: 'ENTRADA' | 'SAIDA'; quantidade: number
  motivo?: string; comandaId?: string; createdAt: string
  item: ItemCardapio & { categoria: Categoria }
}
export type GarcomComparativo = {
  id: string; nome: string; totalVendido: number; totalVendas: number
  meses: { mes: string; vendas: number; total: number; taxa: number }[]
}
