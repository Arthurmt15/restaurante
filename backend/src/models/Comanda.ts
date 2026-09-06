import mongoose, { Schema, Document } from 'mongoose'

export interface IComanda extends Document {
  mesaId: mongoose.Types.ObjectId
  garcomId?: mongoose.Types.ObjectId
  status: string
  subtotal: number
  taxaServico: number
  desconto: number
  total: number
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

const ComandaSchema = new Schema<IComanda>({
  mesaId: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
  garcomId: { type: Schema.Types.ObjectId, ref: 'Garcom' },
  status: { type: String, default: 'ABERTA' },
  subtotal: { type: Number, default: 0 },
  taxaServico: { type: Number, default: 0 },
  desconto: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  tenantId: { type: String, default: '' },
}, { timestamps: true })

ComandaSchema.index({ tenantId: 1 })
ComandaSchema.index({ mesaId: 1 })
ComandaSchema.index({ garcomId: 1 })

ComandaSchema.virtual('mesa', {
  ref: 'Mesa',
  localField: 'mesaId',
  foreignField: '_id',
  justOne: true,
})

ComandaSchema.virtual('garcom', {
  ref: 'Garcom',
  localField: 'garcomId',
  foreignField: '_id',
  justOne: true,
})

export const Comanda = mongoose.model<IComanda>('Comanda', ComandaSchema)
