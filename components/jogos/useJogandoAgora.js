'use client';
import { useEffect } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Enquanto a pessoa está dentro de um jogo, avisa o servidor a cada minuto.
// Com 3 ou mais pessoas no mesmo jogo, o servidor manda o aviso "jogo em alta" para quem não está jogando.
export default function useJogandoAgora(jogo) {
  useEffect(() => {
    if (!jogo) return;
    const sb = criarCliente();
    window.__panthuJogando = jogo;
    const bater = () => { if (document.visibilityState === 'visible') sb.rpc('estou_jogando', { p_jogo: jogo }); };
    bater();
    const t = setInterval(bater, 60000);
    return () => { clearInterval(t); window.__panthuJogando = null; sb.rpc('parar_de_jogar'); };
  }, [jogo]);
}
