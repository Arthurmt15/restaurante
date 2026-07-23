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
  return getImpersonationToken() || sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

// ─── Impersonation ────────────────────────────────────────────────────────────

export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY)
}

export function setImpersonationToken(token: string, info: ImpersonationInfo): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token)
  sessionStorage.setItem(IMPERSONATION_INFO_KEY, JSON.stringify(info))
}

export function getImpersonationInfo(): ImpersonationInfo | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(IMPERSONATION_INFO_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearImpersonation(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY)
  sessionStorage.removeItem(IMPERSONATION_INFO_KEY)
}

// ─── Logout completo ──────────────────────────────────────────────────────────

export function clearAllTokens(): void {
  clearAccessToken()
  clearImpersonation()
}
