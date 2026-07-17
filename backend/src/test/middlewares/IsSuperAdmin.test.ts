import { describe, it, expect } from 'vitest'
import { isSuperAdmin } from '../../middlewares/isSuperAdmin'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes(user?: Record<string, unknown>) {
  const req = { user } as Request
  const res = {
    statusCode: 0,
    body: {} as Record<string, unknown>,
    status(code: number) { this.statusCode = code; return this },
    json(obj: Record<string, unknown>) { this.body = obj; return this },
  } as unknown as Response
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
