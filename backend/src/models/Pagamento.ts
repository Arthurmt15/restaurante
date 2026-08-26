import mongoose, { Schema, Document } from 'mongoose'

export interface IPagamento extends Document {
  comandaId: mongoose.Types.ObjectId
  forma: string
  valor: number
  createdAt: Date
}

const PagamentoSchema = new Schema<IPagamento>({
  comandaId: { type: Schema.Types.ObjectId, ref: 'Comanda', required: true },
  forma: { type: String, required: true },
  valor: { type: Number, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

PagamentoSchema.index({ comandaId: 1 })

export const Pagamento = mongoose.model<IPagamento>('Pagamento', PagamentoSchema)
