import mongoose, { Schema, Document } from 'mongoose'

export interface IRefreshToken extends Document {
  token: string
  usuarioId: mongoose.Types.ObjectId
  expiresAt: Date
  createdAt: Date
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true, unique: true },
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

RefreshTokenSchema.index({ usuarioId: 1 })

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)
