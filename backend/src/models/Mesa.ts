import mongoose, { Schema, Document } from 'mongoose'

export interface IMesa extends Document {
  numero: number
  status: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

const MesaSchema = new Schema<IMesa>({
  numero: { type: Number, required: true },
  status: { type: String, default: 'LIVRE' },
  tenantId: { type: String, default: '' },
}, { timestamps: true })

MesaSchema.index({ numero: 1, tenantId: 1 }, { unique: true })

export const Mesa = mongoose.model<IMesa>('Mesa', MesaSchema)
