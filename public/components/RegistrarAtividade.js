'use client';
import { useEffect } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Informa ao banco que a pessoa está usando o app (alimenta "usuários online" e o histórico de sessões do ADM).
// Roda ao abrir e a cada 2 minutos com a aba visível. Falhas são silenciosas: nunca atrapalham quem usa o app.
function detectar() {
  const ua = navigator.userAgent || '';
  const dispositivo = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'celular' : 'computador';
  const navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'outro';
  return { p_dispositivo: dispositivo, p_navegador: navegador };
}

export default function RegistrarAtividade() {
  useEffect(() => {
    const sb = criarCliente();
    const info = detectar();
    const ping = () => { if (!document.hidden) sb.rpc('registrar_atividade', info).then(() => {}, () => {}); };
    ping();
    const t = setInterval(ping, 120000);
    document.addEventListener('visibilitychange', ping);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', ping); };
  }, []);
  return null;
}
