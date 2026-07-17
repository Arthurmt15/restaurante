import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { ZodError } from 'zod'

// Rotas existentes (sem modificação)
import garconsRouter from './routes/garcons'
import mesasRouter from './routes/mesas'
import cardapioRouter from './routes/cardapio'
import comandasRouter from './routes/comandas'
import relatoriosRouter from './routes/relatorios'
import estoqueRouter from './routes/estoque'

// Novas rotas de autenticação e administração
import authRouter from './routes/auth'
import adminUsuariosRouter from './routes/admin/usuarios'
import adminImpersonateRouter from './routes/admin/impersonate'
import { authenticateToken } from './middlewares/auth'
import { isSuperAdmin } from './middlewares/isSuperAdmin'

// Configuração do servidor Express
const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Middlewares de segurança globais ────────────────────────────────────────

// Helmet: define headers de segurança HTTP (X-Frame-Options, HSTS, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite Next.js consumir a API
}))

// CORS: permite requisições do frontend Next.js
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, true) // em desenvolvimento, permite qualquer origem com credentials
  },
  credentials: true, // necessário para enviar cookies HTTP-Only
}))

// Parsers
app.use(express.json())
app.use(cookieParser()) // necessário para ler req.cookies (refresh token)

// ─── Rate Limiting (apenas na rota de login) ─────────────────────────────────

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                    // máximo 5 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  skipSuccessfulRequests: true, // não conta tentativas bem-sucedidas
})

// ─── Rotas de Autenticação ────────────────────────────────────────────────────

// Rate limit aplicado apenas ao endpoint de login
app.use('/api/auth/login', loginRateLimiter)
app.use('/api/auth', authRouter)

// ─── Rotas Administrativas (protegidas por autenticação + RBAC) ───────────────

app.use('/api/admin/usuarios', authenticateToken, isSuperAdmin, adminUsuariosRouter)
app.use('/api/admin/impersonate', authenticateToken, isSuperAdmin, adminImpersonateRouter)

// ─── Rotas existentes da API (agora protegidas — necessário para multi-tenancy) ──
// authenticateToken é obrigatório pois todos os controllers usam req.user.tenantId

app.use('/api/garcons', authenticateToken, garconsRouter)
app.use('/api/mesas', authenticateToken, mesasRouter)
app.use('/api/cardapio', authenticateToken, cardapioRouter)
app.use('/api/comandas', authenticateToken, comandasRouter)
app.use('/api/relatorios', authenticateToken, relatoriosRouter)
app.use('/api/estoque', authenticateToken, estoqueRouter)


// ─── Tratador de erros global ─────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// ─── Inicialização do servidor ────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
    console.log(`  Autenticação: http://localhost:${PORT}/api/auth`)
    console.log(`  Admin Panel:  http://localhost:${PORT}/api/admin`)
  })
}

export default app
