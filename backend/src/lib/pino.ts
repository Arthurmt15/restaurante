import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Instância do logger Pino configurada para o projeto.
 *
 * Em desenvolvimento, utiliza formato legível no stdout.
 * Em produção, utiliza formato JSON para integração com ferramentas de observabilidade.
 *
 * Configurações:
 * - Nível de log: `debug` em dev, `info` em produção (sobrescrevível via `LOG_LEVEL`).
 * - Timestamps em formato ISO.
 * - Serializadores padrão para erros, requests e responses.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino/file', options: { destination: 1 } } : undefined,
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

export default logger
