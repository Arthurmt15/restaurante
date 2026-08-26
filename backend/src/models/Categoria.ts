import mongoose, { Schema, Document } from 'mongoose'

export interface ICategoria extends Document {
  nome: string
  tenantId: string
  createdAt: Date
}

const CategoriaSchema = new Schema<ICategoria>({
  nome: { type: String, required: true },
  tenantId: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } })

CategoriaSchema.index({ nome: 1, tenantId: 1 }, { unique: true })

export const Categoria = mongoose.model<ICategoria>('Categoria', CategoriaSchema)
