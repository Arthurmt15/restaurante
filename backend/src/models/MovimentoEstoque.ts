import mongoose, { Schema, Document } from 'mongoose'

export interface IMovimentoEstoque extends Document {
  itemId: mongoose.Types.ObjectId
  tipo: string
  quantidade: number
  motivo?: string
  comandaId?: mongoose.Types.ObjectId
  tenantId: string
  createdAt: Date
}

const MovimentoEstoqueSchema = new Schema<IMovimentoEstoque>({
  itemId: { type: Schema.Types.ObjectId, ref: 'ItemCardapio', required: true },
  tipo: { type: String, required: true },
  quantidade: { type: Number, required: true },
  motivo: { type: String },
  comandaId: { type: Schema.Types.ObjectId, ref: 'Comanda' },
  tenantId: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } })

MovimentoEstoqueSchema.index({ itemId: 1 })
MovimentoEstoqueSchema.index({ tenantId: 1 })

export const MovimentoEstoque = mongoose.model<IMovimentoEstoque>('MovimentoEstoque', MovimentoEstoqueSchema)
