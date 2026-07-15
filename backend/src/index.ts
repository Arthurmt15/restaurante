import express from 'express'
import cors from 'cors'
import { ZodError } from 'zod'
import garconsRouter from './routes/garcons'
import mesasRouter from './routes/mesas'
import cardapioRouter from './routes/cardapio'
import comandasRouter from './routes/comandas'
import relatoriosRouter from './routes/relatorios'
import estoqueRouter from './routes/estoque'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api/garcons', garconsRouter)
app.use('/api/mesas', mesasRouter)
app.use('/api/cardapio', cardapioRouter)
app.use('/api/comandas', comandasRouter)
app.use('/api/relatorios', relatoriosRouter)
app.use('/api/estoque', estoqueRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
