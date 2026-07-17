import { generateAccessToken, TokenPayload } from '../middlewares/auth'

export function createAuthToken(overrides?: Partial<TokenPayload>): string {
  const payload: TokenPayload = {
    sub: overrides?.sub || 'test-user-id',
    email: overrides?.email || 'teste@teste.com',
    nome: overrides?.nome || 'Teste',
    role: overrides?.role || 'CLIENTE',
    status: overrides?.status || 'ATIVO',
    tenantId: overrides?.tenantId || 'test-tenant-id',
    ...overrides,
  }
  return generateAccessToken(payload)
}
