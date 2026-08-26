import mongoose, { Schema, Document } from 'mongoose'

export interface IConfiguracoes extends Document {
  tenantId: string
  codigoExclusao: string
  updatedAt: Date
}

const ConfiguracoesSchema = new Schema<IConfiguracoes>({
  tenantId: { type: String, required: true, unique: true },
  codigoExclusao: { type: String, required: true },
}, { timestamps: true })

export const Configuracoes = mongoose.model<IConfiguracoes>('Configuracoes', ConfiguracoesSchema)
