import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  setImpersonationToken,
  getImpersonationToken,
  getImpersonationInfo,
  clearImpersonation,
  clearAllTokens,
} from '../../lib/auth'

beforeEach(() => {
  sessionStorage.clear()
})

describe('Access Token', () => {
  it('deve armazenar e recuperar token', () => {
    setAccessToken('meu-token')
    expect(getAccessToken()).toBe('meu-token')
  })

  it('deve limpar token', () => {
    setAccessToken('meu-token')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})

describe('Impersonation', () => {
  const info = { id: 'u1', nome: 'User', email: 'u@u.com' }

  it('deve armazenar token e info de impersonation', () => {
    setImpersonationToken('imp-token', info)
    expect(getImpersonationToken()).toBe('imp-token')
    expect(getImpersonationInfo()).toEqual(info)
  })

  it('getAccessToken deve priorizar impersonation', () => {
    setAccessToken('normal-token')
    setImpersonationToken('imp-token', info)
    expect(getAccessToken()).toBe('imp-token')
  })

  it('deve limpar impersonation', () => {
    setImpersonationToken('imp-token', info)
    clearImpersonation()
    expect(getImpersonationToken()).toBeNull()
    expect(getImpersonationInfo()).toBeNull()
  })
})

describe('clearAllTokens', () => {
  it('deve limpar todos os tokens', () => {
    setAccessToken('token')
    setImpersonationToken('imp', { id: 'u1', nome: 'U', email: 'u@u.com' })
    clearAllTokens()
    expect(getAccessToken()).toBeNull()
    expect(getImpersonationToken()).toBeNull()
  })
})
