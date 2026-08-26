import mongoose, { Schema, Document } from 'mongoose'

export interface IGarcom extends Document {
  nome: string
  telefone?: string
  ativo: boolean
  tenantId: string
  usuarioId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const GarcomSchema = new Schema<IGarcom>({
  nome: { type: String, required: true },
  telefone: { type: String },
  ativo: { type: Boolean, default: true },
  tenantId: { type: String, default: '' },
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', unique: true, sparse: true },
}, { timestamps: true })

GarcomSchema.index({ tenantId: 1 })

export const Garcom = mongoose.model<IGarcom>('Garcom', GarcomSchema)
