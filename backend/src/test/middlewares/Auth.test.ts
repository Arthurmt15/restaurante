import { describe, it, expect } from 'vitest'
import { generateAccessToken, authenticateToken } from '../../middlewares/auth'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes(headers?: Record<string, string>) {
  const req = { headers: headers || {} } as Request
  const res: any = { statusCode: 0, body: {} }
  res.status = function(code: number) { this.statusCode = code; return this }
  res.json = function(obj: any) { this.body = obj; return this }
  const next: NextFunction = () => { /* no-op */ }
  return { req, res, next }
}

describe('generateAccessToken', () => {
  it('deve gerar um token JWT válido', () => {
    const token = generateAccessToken({
      sub: 'user-1',
      email: 'a@a.com',
      nome: 'User',
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId: 'user-1',
    })
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })
})

describe('authenticateToken', () => {
  it('deve rejeitar requisição sem token', () => {
    const { req, res, next } = mockReqRes()
    authenticateToken(req, res, next)
    expect(res.statusCode).toBe(401)
  })

  it('deve rejeitar token inválido', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer invalid-token' })
    authenticateToken(req, res, next)
    expect(res.statusCode).toBe(401)
  })

  it('deve aceitar token válido e popular req.user', () => {
    const token = generateAccessToken({
      sub: 'user-1', email: 'a@a.com', nome: 'User',
      role: 'CLIENTE', status: 'ATIVO', tenantId: 'user-1',
    })
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` })
    let called = false
    const spyNext: NextFunction = () => { called = true }
    authenticateToken(req, res, spyNext)
    expect(called).toBe(true)
    expect(req.user).toBeTruthy()
    expect(req.user!.sub).toBe('user-1')
    expect(req.user!.tenantId).toBe('user-1')
  })
})
