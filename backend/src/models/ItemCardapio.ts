import mongoose, { Schema, Document } from 'mongoose'

export interface IItemCardapio extends Document {
  nome: string
  nomeEn?: string
  descricao?: string
  preco: number
  porcaoTamanho: string
  observacao?: string
  categoriaId: mongoose.Types.ObjectId
  ativo: boolean
  controlaEstoque: boolean
  estoqueAtual: number
  estoqueMinimo: number
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

const ItemCardapioSchema = new Schema<IItemCardapio>({
  nome: { type: String, required: true },
  nomeEn: { type: String },
  descricao: { type: String },
  preco: { type: Number, required: true },
  porcaoTamanho: { type: String, default: 'Única' },
  observacao: { type: String },
  categoriaId: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true },
  ativo: { type: Boolean, default: true },
  controlaEstoque: { type: Boolean, default: false },
  estoqueAtual: { type: Number, default: 0 },
  estoqueMinimo: { type: Number, default: 0 },
  tenantId: { type: String, default: '' },
}, { timestamps: true })

ItemCardapioSchema.index({ tenantId: 1 })
ItemCardapioSchema.index({ categoriaId: 1 })

export const ItemCardapio = mongoose.model<IItemCardapio>('ItemCardapio', ItemCardapioSchema)
