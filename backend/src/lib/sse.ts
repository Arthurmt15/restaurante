import { Response, Request } from 'express';

// Mapeia o ID do Tenant para um Set de Responses ativas (clientes conectados via SSE)
const clientsByTenant = new Map<string, Set<Response>>();

/**
 * Registra uma nova conexão SSE (Server-Sent Events) para um tenant.
 *
 * Configura os headers HTTP necessários para SSE, incluindo CORS,
 * e inicia um intervalo de keep-alive (ping a cada 20s) para evitar
 * timeout do navegador ou proxy.
 *
 * @param tenantId - Identificador do tenant (restaurante) ao qual o cliente pertence.
 * @param res - Objeto Response do Express para a conexão SSE.
 * @param origin - Origem da requisição (opcional, usado para CORS).
 */
export function addSSEClient(tenantId: string, res: Response, origin?: string) {
  if (!clientsByTenant.has(tenantId)) {
    clientsByTenant.set(tenantId, new Set());
  }
  const clients = clientsByTenant.get(tenantId)!;
  clients.add(res);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];

  // Configurar headers para SSE e CORS
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders(); // Envia os headers imediatamente

  // Keep-alive (Ping a cada 20s para evitar timeout do navegador/proxy)
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  // Remove o cliente quando a conexão for encerrada pelo navegador
  res.on('close', () => {
    clearInterval(interval);
    clients.delete(res);
    if (clients.size === 0) {
      clientsByTenant.delete(tenantId);
    }
  });
}

/**
 * Envia um evento SSE para todos os clientes conectados de um tenant específico.
 *
 * Se nenhum cliente estiver conectado ao tenant, a função retorna silenciosamente.
 *
 * @param tenantId - Identificador do tenant (restaurante) que receberá o broadcast.
 * @param eventName - Nome do evento SSE a ser enviado (ex: 'comanda-atualizada').
 * @param payload - Dados do evento que serão serializados em JSON.
 */
export function broadcastToTenant(tenantId: string, eventName: string, payload: any) {
  const clients = clientsByTenant.get(tenantId);
  if (!clients) return; // Ninguém conectado neste restaurante no momento

  const data = JSON.stringify(payload);
  const message = `event: ${eventName}\ndata: ${data}\n\n`;

  for (const client of clients) {
    client.write(message);
  }
}
