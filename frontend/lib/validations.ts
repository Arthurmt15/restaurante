import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────────
/** Schema de validação para o formulário de login (email + senha) */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória').min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

// ─── Cardápio ────────────────────────────────────────────────────────────────
/** Schema de validação para criação de categoria do cardápio */
export const categoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
})

/** Schema de validação para criação/edição de item do cardápio */
export const itemCardapioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  preco: z.number().positive('Preço deve ser positivo').max(99999.99, 'Preço muito alto'),
  categoriaId: z.string().min(1, 'Selecione uma categoria'),
  controlaEstoque: z.boolean().default(false),
})

// ─── Mesas ───────────────────────────────────────────────────────────────────
/** Schema de validação para criação de mesa */
export const mesaSchema = z.object({
  numero: z.number().int().positive('Número deve ser positivo').max(9999, 'Número muito alto'),
})

// ─── Comandas ────────────────────────────────────────────────────────────────
/** Schema de validação para adicionar item a uma comanda */
export const itemComandaSchema = z.object({
  itemId: z.string().min(1, 'Selecione um item'),
  quantidade: z.number().int().positive('Quantidade deve ser positiva').max(999, 'Quantidade muito alta'),
  observacao: z.string().max(500, 'Observação muito longa').optional(),
  acrescimo: z.number().min(0, 'Acréscimo não pode ser negativo').max(9999.99).default(0),
  desconto: z.number().min(0, 'Desconto não pode ser negativo').max(9999.99).default(0),
})

/** Schema de validação para um pagamento individual */
export const pagamentoSchema = z.object({
  forma: z.string().min(1, 'Selecione a forma de pagamento'),
  valor: z.number().positive('Valor deve ser positivo'),
})

/** Schema de validação para fechar uma comanda com pagamentos */
export const fecharComandaSchema = z.object({
  pagamentos: z.array(pagamentoSchema).min(1, 'Adicione pelo menos um pagamento'),
  taxaServico: z.number().min(0).default(0.1),
})

// ─── Garçom ──────────────────────────────────────────────────────────────────
/** Schema de validação para cadastro de garçom */
export const garcomSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
})

// ─── Estoque ─────────────────────────────────────────────────────────────────
/** Schema de validação para registrar movimentação de estoque */
export const movimentoEstoqueSchema = z.object({
  itemId: z.string().min(1, 'Selecione um item'),
  tipo: z.enum(['ENTRADA', 'SAIDA'], { message: 'Tipo deve ser ENTRADA ou SAIDA' }),
  quantidade: z.number().int().positive('Quantidade deve ser positiva').max(99999),
  motivo: z.string().max(200, 'Motivo muito longo').optional(),
})

// ─── Configurações ───────────────────────────────────────────────────────────
/** Schema de validação para configurações do sistema */
export const configuracoesSchema = z.object({
  codigoExclusao: z.string().min(4, 'Código deve ter pelo menos 4 caracteres').max(50),
})

// ─── Admin Usuários ──────────────────────────────────────────────────────────
/** Schema de validação para criação/edição de usuário no painel admin */
export const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM'], { message: 'Role inválida' }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
})

/** Schema de validação para redefinição de senha */
export const resetSenhaSchema = z.object({
  novaSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

// ─── Helper: parse e retorna erros formatados ────────────────────────────────

/**
 * Valida dados contra um schema Zod e retorna erros formatados.
 * Usado em formulários para exibir mensagens de erro de validação.
 * @param schema - Schema Zod para validação
 * @param data - Dados a serem validados
 * @returns Objeto com success=true + dados ou success=false + lista de erros
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  return { success: false, errors: result.error.issues.map(e => e.message) }
}
