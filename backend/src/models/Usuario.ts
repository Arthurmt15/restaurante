/**
 * Modelo de Usuário do sistema.
 *
 * Representa todos os tipos de usuário: SUPERADMIN, CLIENTE e GARCOM.
 * Suporta autenticação tradicional (email/senha) e Google OAuth.
 *
 * Campos obrigatórios para autenticação tradicional: email, senhaHash, nome
 * Campos obrigatórios para Google OAuth: email, nome, googleId
 * O campo senhaHash é opcional para usuários que fazem login apenas via Google.
 */
import mongoose, { Schema, Document } from 'mongoose'

/**
 * Interface que define a estrutura de um documento de Usuário no MongoDB.
 *
 * @property email - Email único do usuário (usado como identificador de login)
 * @property senhaHash - Hash da senha (opcional para usuários Google)
 * @property nome - Nome completo do usuário
 * @property googleId - ID único do Google OAuth (opcional para login tradicional)
 * @property imagem - URL da imagem de perfil do Google (opcional)
 * @property role - Papel do usuário: SUPERADMIN, CLIENTE ou GARCOM
 * @property status - Status da conta: ATIVO, SUSPENSO ou INADIMPLENTE
 * @property tenantId - ID do tenant para isolamento de dados multi-tenant
 * @property ultimoLogin - Data e hora do último login bem-sucedido
 * @property createdAt - Data de criação do registro (automático pelo Mongoose)
 * @property updatedAt - Data da última atualização (automático pelo Mongoose)
 */
export interface IUsuario extends Document {
  email: string
  senhaHash?: string
  nome: string
  googleId?: string
  imagem?: string
  role: string
  status: string
  tenantId: string
  ultimoLogin?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema do Mongoose para a coleção de Usuários.
 *
 * Define validações, tipos, índices e valores padrão para cada campo.
 * O campo senhaHash é opcional para suportar login via Google OAuth.
 */
const UsuarioSchema = new Schema<IUsuario>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senhaHash: { type: String, required: false },
  nome: { type: String, required: true, trim: true },
  googleId: { type: String, sparse: true, unique: true, default: null },
  imagem: { type: String, default: null },
  role: { type: String, enum: ['SUPERADMIN', 'CLIENTE', 'GARCOM'], default: 'CLIENTE' },
  status: { type: String, enum: ['ATIVO', 'SUSPENSO', 'INADIMPLENTE'], default: 'ATIVO' },
  tenantId: { type: String, default: '' },
  ultimoLogin: { type: Date },
}, { timestamps: true })

export const Usuario = mongoose.model<IUsuario>('Usuario', UsuarioSchema)
