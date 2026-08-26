import mongoose, { Schema, Document } from 'mongoose'

export interface IAtividadeGarcom extends Document {
  garcomId: string
  garcomNome: string
  acao: string
  detalhes: string
  mesaNumero: number
  tenantId: string
  createdAt: Date
}

const AtividadeGarcomSchema = new Schema<IAtividadeGarcom>({
  garcomId: { type: String, required: true },
  garcomNome: { type: String, required: true },
  acao: { type: String, required: true },
  detalhes: { type: String, required: true },
  mesaNumero: { type: Number, required: true },
  tenantId: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } })

AtividadeGarcomSchema.index({ tenantId: 1 })
AtividadeGarcomSchema.index({ garcomId: 1 })

export const AtividadeGarcom = mongoose.model<IAtividadeGarcom>('AtividadeGarcom', AtividadeGarcomSchema)
