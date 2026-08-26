import mongoose, { Schema, Document } from 'mongoose'

export interface IUsuario extends Document {
  email: string
  senhaHash: string
  nome: string
  role: string
  status: string
  tenantId: string
  ultimoLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const UsuarioSchema = new Schema<IUsuario>({
  email: { type: String, required: true, unique: true },
  senhaHash: { type: String, required: true },
  nome: { type: String, required: true },
  role: { type: String, default: 'CLIENTE' },
  status: { type: String, default: 'ATIVO' },
  tenantId: { type: String, default: '' },
  ultimoLogin: { type: Date },
}, { timestamps: true })

export const Usuario = mongoose.model<IUsuario>('Usuario', UsuarioSchema)
