import mongoose, { Schema, Document } from 'mongoose'

export interface IHistoricoPreco extends Document {
  itemId: mongoose.Types.ObjectId
  precoAnterior: number
  precoNovo: number
  tenantId: string
  alteradoPor?: string
  createdAt: Date
}

const HistoricoPrecoSchema = new Schema<IHistoricoPreco>({
  itemId: { type: Schema.Types.ObjectId, ref: 'ItemCardapio', required: true },
  precoAnterior: { type: Number, required: true },
  precoNovo: { type: Number, required: true },
  tenantId: { type: String, required: true },
  alteradoPor: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

HistoricoPrecoSchema.index({ itemId: 1 })
HistoricoPrecoSchema.index({ tenantId: 1 })

export const HistoricoPreco = mongoose.model<IHistoricoPreco>('HistoricoPreco', HistoricoPrecoSchema)
