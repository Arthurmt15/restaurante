# Sistema de Gestão de Restaurante

PDV completo para restaurante com controle de mesas, comandas e suporte a múltiplos restaurantes (multi-tenancy).

## Stack Técnica

- **Backend:** Express + TypeScript + Prisma/MongoDB
- **Frontend:** Next.js 15 (Pages Router) + React 19 + TypeScript
- **Infra:** Docker Compose (backend + frontend + MongoDB replica set)

## Funcionalidades

- Controle de mesas e comandas (abrir, adicionar itens, fechar)
- Cardápio com categorias e controle de estoque
- Pagamento multi-forma com fechamento de comanda
- Ranking de garçons e relatórios de vendas
- Painel admin com gestão de usuários e impersonation
- Notificações em tempo real via SSE
- Impressão térmica 80mm
- Multi-tenancy via campo `tenantId`

## Como Rodar

### Docker (recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Desenvolvimento Local

Requer MongoDB local com replica set (`rs0`).

```bash
# Backend
cd backend
npm install
npm run db:deploy
npm run seed:admin
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Seed Inicial

```bash
# Popula cardápio demo (apaga dados existentes — usar só em dev)
npm run db:seed
# Cria admin padrão
npm run seed:admin
```

### Credenciais Demo

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@restaurante.com | Admin@2025! |
| Demo | demo@restaurante.com | 12345678 |

> Trocar senhas após primeiro login.

## Testes

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Estrutura do Projeto

```
restaurante/
├── backend/
│   ├── prisma/          # Schema e configuração do banco
│   ├── src/
│   │   ├── routes/      # Rotas Express (comandas, mesas, cardápio, etc.)
│   │   ├── services/    # Lógica de negócio (comanda.service.ts)
│   │   ├── middlewares/  # Auth, RBAC, rate limiting
│   │   └── lib/         # Config, logger, SSE, Prisma client
│   └── test/            # Testes de integração (vitest + supertest)
├── frontend/
│   ├── components/      # React components (modais, layout, notifications)
│   ├── contexts/        # AuthContext
│   ├── lib/             # API helpers, auth, tipos
│   ├── pages/           # Pages Router (login, admin, comandas, etc.)
│   └── test/            # Testes (vitest + testing-library)
└── docker-compose.yml
```

## Variáveis de Ambiente

Ver `.env.example` na raiz do projeto.

## Segurança

- JWT com access token (15 min) + refresh token em cookie HTTP-Only
- RBAC com papéis: SUPERADMIN, CLIENTE, GARCOM
- Rate limiting no login (5 tentativas/15 min)
- CORS com allowlist de origens
- Código de exclusão com hash bcrypt
- Token SSE com TTL de 5 minutos
- Código de exclusão passa por header (não query string)

## Licença

Projeto privado.
