import { getAccessToken, clearAllTokens } from './auth'

/** URL base da API backend, configurada via variável de ambiente */
const API = process.env.NEXT_PUBLIC_API_URL || '/api'

// ─── Helper: headers com autenticação ────────────────────────────────────────

/**
 * Monta os headers HTTP com autenticação Bearer.
 * Inclui o token de acesso (ou impersonation) e headers extras se fornecidos.
 * @param extra - Headers adicionais para incluir na requisição
 */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

// ─── Helper: tratamento de resposta com refresh automático ───────────────────

/**
 * Processa a resposta HTTP e trata erros automaticamente.
 * Se receber 401 com TOKEN_EXPIRED, tenta renovar o token uma vez.
 * Se o refresh falhar, redireciona para o login.
 * @param res - Resposta HTTP recebida
 * @param retry - Função para retry após refresh do token
 */
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

/**
 * Tenta renovar o access token usando o refresh token (HTTP-Only cookie).
 * Chamado automaticamente quando um request retorna 401/TOKEN_EXPIRED.
 * @returns true se o refresh foi bem-sucedido, false caso contrário
 */
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

/**
 * Realiza uma requisição GET autenticada.
 * @param path - Caminho da API (ex: '/comandas?status=ABERTA')
 * @returns Dados da resposta tipados
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    credentials: 'include',
  })
  return handleResponse<T>(res, () => apiGet<T>(path))
}

/**
 * Realiza uma requisição POST autenticada para criar recursos.
 * @param path - Caminho da API
 * @param body - Dados a serem enviados no corpo da requisição
 * @returns Dados da resposta tipados
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, () => apiPost<T>(path, body))
}

/**
 * Realiza uma requisição PUT autenticada para atualizar recursos completos.
 * @param path - Caminho da API
 * @param body - Dados completos do recurso atualizado
 * @returns Dados da resposta tipados
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res, () => apiPut<T>(path, body))
}

/**
 * Realiza uma requisição PATCH autenticada para atualizações parciais.
 * @param path - Caminho da API
 * @param body - Campos a serem atualizados (parcial)
 * @returns Dados da resposta tipados
 */
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, () => apiPatch<T>(path, body))
}

/**
 * Realiza uma requisição DELETE autenticada para remover recursos.
 * Suporta headers extras (ex: x-codigo-exclusao para autorização).
 * @param path - Caminho da API
 * @param headers - Headers adicionais (ex: código de autorização)
 */
export async function apiDelete(path: string, headers?: Record<string, string>): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: authHeaders(headers),
    credentials: 'include',
  })
  if (res.status === 204) return
  await handleResponse<void>(res, () => apiDelete(path, headers))
}

// ─── Tipos existentes (sem modificação) ──────────────────────────────────────

export type Mesa = { id: string; numero: number; status: string; _count: { comandas: number } }
export type Garcom = { id: string; nome: string; telefone?: string; ativo: boolean; usuarioId?: string | null }
export type Categoria = { id: string; nome: string; itens: ItemCardapio[] }
export type CategoriaInfo = { id: string; nome: string }
export type ItemCardapio = { id: string; nome: string; nomeEn?: string; descricao?: string; preco: number; porcaoTamanho?: string; observacao?: string; categoriaId: string; categoria?: CategoriaInfo; ativo: boolean; controlaEstoque: boolean; estoqueAtual: number; estoqueMinimo: number }
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
  quantidade: number; precoUnit: number; observacao?: string; acrescimo?: number
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

export type ProdutoMaisVendido = {
  id: string
  nome: string
  categoria: string
  quantidadeVendida: number
  totalFaturado: number
  precoMedio: number
}

export type HistoricoPreco = {
  id: string
  itemId: string
  nome: string
  precoAnterior: number
  precoNovo: number
  alteradoPor?: string
  createdAt: string
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
