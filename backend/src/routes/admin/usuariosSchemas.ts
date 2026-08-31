import { z } from 'zod'

/** Schema de validação para criação de usuário. */
export const criarUsuarioSchema = z.object({
  email: z.string().min(3, 'Email/Usuário deve ter ao menos 3 caracteres'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM']).default('CLIENTE'),
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']).default('ATIVO'),
  tenantId: z.string().optional(),
})

/** Schema de validação para edição de usuário. */
export const editarUsuarioSchema = z.object({
  email: z.string().min(3, 'Email/Usuário deve ter ao menos 3 caracteres').optional(),
  nome: z.string().min(2).optional(),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM']).optional(),
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']).optional(),
  tenantId: z.string().optional(),
})

/** Schema de validação para atualização de status do usuário. */
export const statusSchema = z.object({
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']),
})

/** Schema de validação para redefinição de senha. */
export const resetSenhaSchema = z.object({
  novaSenha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>
export type StatusInput = z.infer<typeof statusSchema>
export type ResetSenhaInput = z.infer<typeof resetSenhaSchema>
