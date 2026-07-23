import { describe, it, expect } from 'vitest'
import { isSuperAdmin } from '../../middlewares/isSuperAdmin'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes(user?: Record<string, unknown>) {
  const req = { user } as Request
  const res: any = { statusCode: 0, body: {} }
  res.status = function(code: number) { this.statusCode = code; return this }
  res.json = function(obj: any) { this.body = obj; return this }
  const next: NextFunction = () => { /* no-op */ }
  return { req, res, next }
}

describe('isSuperAdmin', () => {
  it('deve bloquear se não houver req.user', () => {
    const { req, res, next } = mockReqRes()
    isSuperAdmin(req, res, next)
    expect(res.statusCode).toBe(401)
  })

  it('deve bloquear se role não for SUPERADMIN', () => {
    const { req, res, next } = mockReqRes({ sub: 'u1', role: 'CLIENTE' })
    isSuperAdmin(req, res, next)
    expect(res.statusCode).toBe(403)
  })

  it('deve permitir SUPERADMIN', () => {
    const { req, res, next } = mockReqRes({ sub: 'u1', role: 'SUPERADMIN' })
    let called = false
    const spyNext: NextFunction = () => { called = true }
    isSuperAdmin(req, res, spyNext)
    expect(called).toBe(true)
  })
})
