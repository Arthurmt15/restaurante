import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  tenantId: string
  usuarioId?: string
  usuarioNome: string
  acao: string
  recurso: string
  recursoId?: string
  detalhes?: string
  ip?: string
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  tenantId: { type: String, required: true },
  usuarioId: { type: String },
  usuarioNome: { type: String, required: true },
  acao: { type: String, required: true },
  recurso: { type: String, required: true },
  recursoId: { type: String },
  detalhes: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now },
})

AuditLogSchema.index({ tenantId: 1 })
AuditLogSchema.index({ usuarioId: 1 })
AuditLogSchema.index({ timestamp: 1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
