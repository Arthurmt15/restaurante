// Configuração central de segredos — resolve tardiamente para que testes
// e scripts que definem env em runtime funcionem, e falha rápido em produção.

/**
 * Obtém o segredo JWT a partir da variável de ambiente.
 *
 * Em produção, lança erro se a variável não estiver definida.
 * Em desenvolvimento, retorna um segredo padrão com aviso no console.
 *
 * @returns O segredo JWT utilizado para assinar e verificar tokens.
 * @throws {Error} Se `NODE_ENV` for 'production' e `JWT_SECRET` não estiver definido.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET antes de iniciar em produção.'
    )
  }

  console.warn(
    '[AVISO] JWT_SECRET não definido — usando segredo de desenvolvimento. NUNCA rode produção assim.'
  )
  return 'dev-only-secret'
}
