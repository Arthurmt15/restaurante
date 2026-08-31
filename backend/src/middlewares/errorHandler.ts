import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../lib/comanda-utils'
import { ZodError } from 'zod'

/**
 * Middleware de tratamento de erros centralizado.
 * Substitui os try/catch repetidos nos handlers de rota.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
  }
  console.error('[ERROR]', err)
  return res.status(500).json({ error: 'Erro interno do servidor' })
}