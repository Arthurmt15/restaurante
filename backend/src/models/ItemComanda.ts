import mongoose, { Schema, Document } from 'mongoose'

export interface IItemComanda extends Document {
  comandaId: mongoose.Types.ObjectId
  itemId: mongoose.Types.ObjectId
  quantidade: number
  precoUnit: number
  observacao?: string
  acrescimo: number
  createdAt: Date
}

const ItemComandaSchema = new Schema<IItemComanda>({
  comandaId: { type: Schema.Types.ObjectId, ref: 'Comanda', required: true },
  itemId: { type: Schema.Types.ObjectId, ref: 'ItemCardapio', required: true },
  quantidade: { type: Number, default: 1 },
  precoUnit: { type: Number, required: true },
  observacao: { type: String },
  acrescimo: { type: Number, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } })

ItemComandaSchema.index({ comandaId: 1 })

export const ItemComanda = mongoose.model<IItemComanda>('ItemComanda', ItemComandaSchema)
