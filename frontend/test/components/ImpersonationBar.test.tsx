import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setImpersonationToken, clearImpersonation } from '../../lib/auth'

vi.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: vi.fn() }),
}))

beforeEach(() => {
  sessionStorage.clear()
})

describe('ImpersonationBar', () => {
  it('deve renderizar quando há impersonation ativa', async () => {
    setImpersonationToken('token', {
      id: 'user-1',
      nome: 'Maria',
      email: 'maria@teste.com',
    })

    const ImpersonationBar = (await import('../../components/ImpersonationBar')).default
    render(<ImpersonationBar />)

    expect(screen.getByText(/Maria/)).toBeTruthy()
    expect(screen.getByText('← Retornar ao Painel Admin')).toBeTruthy()
  })

  it('deve retornar null sem impersonation', async () => {
    clearImpersonation()
    const ImpersonationBar = (await import('../../components/ImpersonationBar')).default
    const { container } = render(<ImpersonationBar />)
    expect(container.innerHTML).toBe('')
  })
})
