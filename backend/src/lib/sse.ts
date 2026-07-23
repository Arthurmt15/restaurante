import { Response } from 'express';

// Mapeia o ID do Tenant para um Set de Responses ativas (clientes conectados via SSE)
const clientsByTenant = new Map<string, Set<Response>>();

/**
 * Registra uma nova conexão SSE para um tenant
 */
export function addSSEClient(tenantId: string, res: Response) {
  if (!clientsByTenant.has(tenantId)) {
    clientsByTenant.set(tenantId, new Set());
  }
  const clients = clientsByTenant.get(tenantId)!;
  clients.add(res);

  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
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
 * Dispara um evento para todos os clientes de um tenant específico
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
