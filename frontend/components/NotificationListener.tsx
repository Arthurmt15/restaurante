import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getAccessToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationListener() {
  const { usuario } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Apenas Administradores e Clientes devem receber alertas
    if (!usuario || usuario.role === 'GARCOM') return;

    const token = getAccessToken();
    if (!token) return;

    // Criar conexão SSE. Passamos o token via query param, pois EventSource nativo
    // não suporta enviar custom headers (Authorization). 
    // O backend precisa estar preparado para ler o token da query string, ou usamos
    // cookies. Como usamos bearer token no Header, precisamos usar polyfill ou adaptar o backend.
    
    // IMPORTANTE: Como usamos fetch na API original com Header Authorization,
    // o navegador nativo não envia headers no EventSource.
    // Vamos adicionar o token na URL.
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/comandas/stream?token=${token}`;
    
    const sse = new EventSource(url);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      // Mensagens de ping são tratadas silenciosamente (para keep-alive)
    };

    sse.addEventListener('novo_pedido', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Exibir notificação em toast
        toast.success(
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>{data.mesa}</strong>
            <span style={{ fontSize: '0.9em' }}>{data.quantidade}x {data.item}</span>
            <span style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>Por: {data.garcom}</span>
          </div>,
          { duration: 6000, position: 'top-right' }
        );

        // Tocar alerta sonoro (Ding suave usando Web Audio API)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
          oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
          
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Volume moderado
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
          console.log('Áudio não suportado ou bloqueado', e);
        }
      } catch (err) {
        console.error('Erro ao processar evento SSE:', err);
      }
    });

    sse.addEventListener('comanda_fechada', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        toast(
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>{data.mesa} Encerrada</strong>
            <span style={{ fontSize: '0.9em' }}>Total: R$ {data.total.toFixed(2)}</span>
            <span style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>Por: {data.garcom}</span>
          </div>,
          { duration: 8000, position: 'top-right', icon: '💰' }
        );

        // Tocar alerta sonoro (Tom mais alto para encerramento)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
          oscillator.frequency.exponentialRampToValueAtTime(523.25, audioCtx.currentTime + 0.4);
          
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.4);
        } catch (e) {}
      } catch (err) {
        console.error('Erro ao processar evento SSE:', err);
      }
    });

    sse.onerror = (err) => {
      console.error('Erro no EventSource (SSE):', err);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [usuario]);

  return null;
}
