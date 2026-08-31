// Gerenciamento de tokens de autenticação no frontend.
// Usa sessionStorage para o Access Token (evita persistência entre abas/restart
// e reduz superfície de XSS comparado a localStorage) e o cookie HTTP-Only
// para o Refresh Token (gerenciado pelo servidor).

/** Chave para armazenar o access token no sessionStorage */
const ACCESS_TOKEN_KEY = 'auth_access_token'
/** Chave para armazenar o token de impersonation no localStorage */
const IMPERSONATION_TOKEN_KEY = 'impersonation_token'
/** Chave para armazenar as informações do usuário impersonado */
const IMPERSONATION_INFO_KEY = 'impersonation_info'

/** Interface que representa um usuário do sistema */
export interface Usuario {
  id: string
  email: string
  nome: string
  role: 'SUPERADMIN' | 'CLIENTE' | 'GARCOM'
  status: string
  ultimoLogin?: string
  garcomId?: string
}

/** Informações do usuário que está sendo impersonado (logado como outro) */
export interface ImpersonationInfo {
  id: string
  nome: string
  email: string
}

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Obtém o access token atual.
 * Prioriza o token de impersonação se houver, senão usa o token normal.
 * @returns Token de acesso ou null se não estiver autenticado
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  // Se há um token de impersonation ativo, usá-lo nas requisições
  return getImpersonationToken() || sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Armazena o access token no sessionStorage.
 * @param token - Token JWT de acesso
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

/**
 * Remove o access token do sessionStorage.
 */
export function clearAccessToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

// ─── Impersonation ────────────────────────────────────────────────────────────

/**
 * Obtém o token de impersonação (logar como outro usuário).
 * Usado por superadmins para acessar o sistema como se fosse outro usuário.
 * @returns Token de impersonação ou null
 */
export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IMPERSONATION_TOKEN_KEY)
}

/**
 * Armazena o token e informações do usuário impersonado.
 * @param token - Token de impersonação
 * @param info - Dados do usuário que está sendo impersonado
 */
export function setImpersonationToken(token: string, info: ImpersonationInfo): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(IMPERSONATION_TOKEN_KEY, token)
  localStorage.setItem(IMPERSONATION_INFO_KEY, JSON.stringify(info))
}

/**
 * Obtém as informações do usuário que está sendo impersonado.
 * @returns Dados do usuário impersonado ou null
 */
export function getImpersonationInfo(): ImpersonationInfo | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(IMPERSONATION_INFO_KEY)
  return raw ? JSON.parse(raw) : null
}

/**
 * Remove os dados de impersonação do localStorage.
 */
export function clearImpersonation(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPERSONATION_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATION_INFO_KEY)
}

// ─── Logout completo ──────────────────────────────────────────────────────────

/**
 * Limpa todos os tokens de autenticação (access token + impersonation).
 * Chamado durante logout ou quando a sessão expira.
 */
export function clearAllTokens(): void {
  clearAccessToken()
  clearImpersonation()
}
