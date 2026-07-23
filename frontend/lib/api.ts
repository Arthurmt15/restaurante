import { getAccessToken, clearAllTokens } from './auth'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

// ─── Helper: headers com autenticação ────────────────────────────────────────

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

// ─── Helper: tratamento de resposta com refresh automático ───────────────────

async function handleResponse<T>(res: Response, retry: () => Promise<T>): Promise<T> {
  // Se recebemos 401 com código TOKEN_EXPIRED, tentar renovar o token uma vez
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken()
      if (refreshed) return retry()
    }
    // Token inválido ou refresh falhou — redirecionar para login
    clearAllTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Sessão expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Requisição falhou: ${res.status}`)
  }

  return res.json()
}

// ─── Renovação de token via refresh cookie ────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false

    const { accessToken } = await res.json()
    const { setAccessToken } = await import('./auth')
    setAccessToken(accessToken)
    return true
  } catch {
    return false
  }
}

export type AtividadeGarcom = {
  id: string;
  garcomId: string;
  garcomNome: string;
  acao: string;
  detalhes: string;
  mesaNumero: number;
  tenantId: string;
  createdAt: string;
}

export type Configuracoes = {
  id: string;
  tenantId: string;
  codigoExclusao: string;
  updatedAt: string;
}

// ─── Rotas Administrativas ──────────────────────────────────────────────────

// ─── Requisições HTTP genéricas ───────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    credentials: 'include',
  })
  return handleResponse<T>(res, () => apiGet<T>(path))
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, () => apiPost<T>(path, body))
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res, () => apiPut<T>(path, body))
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, () => apiPatch<T>(path, body))
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (res.status === 204) return
  await handleResponse<void>(res, () => apiDelete(path))
}

// ─── Tipos existentes (sem modificação) ──────────────────────────────────────

export type Mesa = { id: string; numero: number; status: string; _count: { comandas: number } }
export type Garcom = { id: string; nome: string; telefone?: string; ativo: boolean; usuarioId?: string | null }
export type Categoria = { id: string; nome: string; itens: ItemCardapio[] }
export type CategoriaInfo = { id: string; nome: string }
export type ItemCardapio = { id: string; nome: string; nomeEn?: string; descricao?: string; preco: number; porcaoTamanho?: string; observacao?: string; categoriaId: string; categoria?: CategoriaInfo; ativo: boolean; estoqueAtual: number; estoqueMinimo: number }
export type Pagamento = { id: string; comandaId: string; forma: string; valor: number; createdAt: string }
export type Comanda = {
  id: string; mesaId: string; garcomId?: string; status: string
  subtotal: number; taxaServico: number; desconto?: number; total: number
  mesa: Mesa; garcom?: Garcom
  itens: ItemComanda[]
  pagamentos: Pagamento[]
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

// ─── Tipos de autenticação e admin ────────────────────────────────────────────

export type UsuarioAdmin = {
  id: string
  email: string
  nome: string
  role: 'SUPERADMIN' | 'CLIENTE'
  status: 'ATIVO' | 'SUSPENSO' | 'INADIMPLENTE'
  ultimoLogin?: string
  createdAt: string
  updatedAt: string
  tenantId?: string
}

export type PaginacaoUsuarios = {
  usuarios: UsuarioAdmin[]
  paginacao: {
    total: number
    pagina: number
    limite: number
    totalPaginas: number
  }
}

export type ResumoAdmin = {
  total: number
  ativos: number
  suspensos: number
  inadimplentes: number
}
