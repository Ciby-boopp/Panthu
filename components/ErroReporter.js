'use client';
import { useEffect } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Manda para o painel ADM (Monitoramento técnico) os erros que acontecem na tela de quem usa o app.
export default function ErroReporter() {
  useEffect(() => {
    let sb = null; let enviados = 0;
    const enviar = (msg) => {
      if (enviados >= 5 || !msg) return;
      enviados++;
      try { (sb ||= criarCliente()).rpc('registrar_erro', { p_mensagem: String(msg).slice(0, 400), p_rota: location.pathname, p_origem: 'navegador' }); } catch {}
    };
    const aoErro = (e) => enviar(e.message || 'Erro de tela');
    const aoRejeitar = (e) => enviar(e.reason?.message || String(e.reason || 'Promessa rejeitada'));
    window.addEventListener('error', aoErro);
    window.addEventListener('unhandledrejection', aoRejeitar);
    return () => { window.removeEventListener('error', aoErro); window.removeEventListener('unhandledrejection', aoRejeitar); };
  }, []);
  return null;
}
