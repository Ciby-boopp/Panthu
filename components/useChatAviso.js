'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const hora = (d) => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// Conta as mensagens não lidas (guardadas no banco, valem em qualquer aparelho) e os pedidos de conversa.
// Enquanto o app está aberto, novas mensagens chegam em tempo real e mostram um aviso com um resumo.
export default function useChatAviso(path) {
  const [sb] = useState(() => criarCliente());
  const [mapa, setMapa] = useState({});
  const [pedidos, setPedidos] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [geralId, setGeralId] = useState(null);
  const eu = useRef(null), salaRef = useRef(null), geralRef = useRef(null);

  const sala = path.match(/^\/app\/chat\/([^/]+)/)?.[1] || (path === '/app/chat' ? geralId : null);
  salaRef.current = sala; geralRef.current = geralId;

  const carregar = useCallback(async () => {
    const [n, p] = await Promise.all([sb.rpc('nao_lidas'), sb.rpc('meus_pedidos_recebidos')]);
    if (!n.error && n.data) {
      const m = {};
      n.data.forEach((x) => { if (x.sala_id !== salaRef.current) m[x.sala_id] = Number(x.total); });
      setMapa(m);
    }
    if (!p.error && p.data) { setPedidos(p.data.length); return p.data; }
    return null;
  }, [sb]);

  // Ao abrir uma conversa (ou a comunidade), ela passa a contar como lida.
  useEffect(() => {
    if (!sala) return;
    setMapa((m) => (m[sala] ? { ...m, [sala]: 0 } : m));
    sb.rpc('marcar_lida', { sl: sala });
  }, [sala, sb]);

  useEffect(() => {
    let canal; let vivo = true;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !vivo) return;
      eu.current = user.id;
      const { data: g } = await sb.from('chat_salas').select('id').eq('tipo', 'geral').maybeSingle();
      if (g && vivo) setGeralId(g.id);
      await carregar();
      if (!vivo) return;
      canal = sb.channel('aviso-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => {
          const m = p.new;
          if (!m || m.autor_id === eu.current) return;
          if (m.sala_id === salaRef.current) { sb.rpc('marcar_lida', { sl: m.sala_id }); return; }
          setMapa((x) => ({ ...x, [m.sala_id]: (x[m.sala_id] || 0) + 1 }));
          setAviso({ id: m.id || Date.now(), titulo: 'Nova mensagem', hora: hora(m.criado_em), texto: String(m.texto || '').slice(0, 90), href: m.sala_id === geralRef.current ? '/app/chat' : `/app/chat/${m.sala_id}` });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversa_pedidos', filter: `para=eq.${user.id}` }, async () => {
          const lista = await carregar();
          const novo = lista?.[0];
          setAviso({ id: Date.now(), titulo: 'Pedido para conversar', hora: hora(), texto: novo ? `${novo.nome} quer conversar com você` : 'Você recebeu um pedido', href: '/app/chat' });
        })
        .subscribe();
    })();
    const voltou = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', voltou);
    return () => { vivo = false; document.removeEventListener('visibilitychange', voltou); if (canal) sb.removeChannel(canal); };
  }, [sb, carregar]);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);

  const nao = Object.values(mapa).reduce((a, b) => a + b, 0) + pedidos;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s/, '');
    document.title = nao > 0 ? `(${nao > 9 ? '9+' : nao}) ${base}` : base;
  }, [nao]);
  return { nao, aviso, fechar: () => setAviso(null) };
}
