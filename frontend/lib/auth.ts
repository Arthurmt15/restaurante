// Gerenciamento de tokens de autenticação no frontend.
// Usa sessionStorage para o Access Token (evita persistência entre abas/restart)
// e o cookie HTTP-Only para o Refresh Token (gerenciado pelo servidor).

const ACCESS_TOKEN_KEY = 'auth_access_token'
const IMPERSONATION_TOKEN_KEY = 'impersonation_token'
const IMPERSONATION_INFO_KEY = 'impersonation_info'

export interface Usuario {
  id: string
  email: string
  nome: string
  role: 'SUPERADMIN' | 'CLIENTE' | 'GARCOM'
  status: string
  ultimoLogin?: string
  garcomId?: string
}

export interface ImpersonationInfo {
  id: string
  nome: string
  email: string
}

// ─── Access Token ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  // Se há um token de impersonation ativo, usá-lo nas requisições
  return getImpersonationToken() || localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

// ─── Impersonation ────────────────────────────────────────────────────────────

export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IMPERSONATION_TOKEN_KEY)
}

export function setImpersonationToken(token: string, info: ImpersonationInfo): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(IMPERSONATION_TOKEN_KEY, token)
  localStorage.setItem(IMPERSONATION_INFO_KEY, JSON.stringify(info))
}

export function getImpersonationInfo(): ImpersonationInfo | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(IMPERSONATION_INFO_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearImpersonation(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPERSONATION_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATION_INFO_KEY)
}

// ─── Logout completo ──────────────────────────────────────────────────────────

export function clearAllTokens(): void {
  clearAccessToken()
  clearImpersonation()
}
