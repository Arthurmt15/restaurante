import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

const BACKEND_URL = process.env.API_URL || 'http://localhost:3001';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token, t } = req.query;
  if (!token || !t) {
    return res.status(400).json({ error: 'token and t are required' });
  }

  const targetUrl = `${BACKEND_URL}/api/comandas/stream?token=${token}&t=${t}`;

  const proxyReq = http.get(targetUrl, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    proxyRes.pipe(res);

    proxyRes.on('error', () => {
      res.end();
    });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Backend unavailable' });
    } else {
      res.end();
    }
  });

  req.on('close', () => {
    proxyReq.destroy();
  });
}
