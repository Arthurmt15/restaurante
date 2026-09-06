import mongoose, { Schema, Document } from 'mongoose'

export interface IUsuarioBarraca extends Document {
  usuarioId: mongoose.Types.ObjectId
  barracaId: string
  role: 'CLIENTE' | 'GARCOM'
  status: 'PENDENTE' | 'ATIVO' | 'SUSPENSO'
  createdAt: Date
  updatedAt: Date
}

const UsuarioBarracaSchema = new Schema<IUsuarioBarraca>({
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  barracaId: { type: String, required: true },
  role: { type: String, enum: ['CLIENTE', 'GARCOM'], required: true },
  status: { type: String, enum: ['PENDENTE', 'ATIVO', 'SUSPENSO'], default: 'PENDENTE' },
}, { timestamps: true })

UsuarioBarracaSchema.index({ usuarioId: 1, barracaId: 1 }, { unique: true })
UsuarioBarracaSchema.index({ barracaId: 1 })
UsuarioBarracaSchema.index({ status: 1 })

export const UsuarioBarraca = mongoose.model<IUsuarioBarraca>('UsuarioBarraca', UsuarioBarracaSchema)
