'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';
import { tocarNotificacao, destravarSom } from '@/lib/somNotificacao';
import { limparNotificacoes } from '@/lib/notificacoes';

const hora = (d) => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// Conta as mensagens não lidas (guardadas no banco, valem em qualquer aparelho) e os pedidos de conversa.
// Enquanto o app está aberto, novas mensagens chegam em tempo real e mostram um aviso com um resumo.
export default function useChatAviso(path) {
  const sbRef = useRef(null);
  // A conexão é criada só no navegador, dentro de efeitos (a página também é montada no build, sem Supabase).
  const getSb = useCallback(() => (sbRef.current ||= criarCliente()), []);
  const [mapa, setMapa] = useState({});
  const [pedidos, setPedidos] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [geralId, setGeralId] = useState(null);
  const avisar = useCallback((a) => { setAviso(a); tocarNotificacao(); }, []);
  useEffect(() => { const d = () => destravarSom(); window.addEventListener('pointerdown', d, { once: true }); return () => window.removeEventListener('pointerdown', d); }, []);
  // Visualizou, sumiu: ao abrir/voltar ao app, as notificações do celular são removidas; o aviso na tela some sozinho
  // (ou ao abrir a tela para onde ele leva).
  useEffect(() => {
    limparNotificacoes();
    const v = () => { if (!document.hidden) limparNotificacoes(); };
    document.addEventListener('visibilitychange', v);
    return () => document.removeEventListener('visibilitychange', v);
  }, []);
  useEffect(() => { if (path) limparNotificacoes(path); }, [path]);
  useEffect(() => {
    if (!aviso) return;
    if (aviso.href && aviso.href.split('?')[0] === path) { setAviso(null); return; }
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [aviso, path]);
  const eu = useRef(null), salaRef = useRef(null), geralRef = useRef(null);

  const largo = typeof window !== 'undefined' && window.matchMedia('(min-width: 861px)').matches; // no computador /app/chat já abre a comunidade
  const sala = path.match(/^\/app\/chat\/([^/]+)/)?.[1] || (path === '/app/chat' && largo ? geralId : null);
  salaRef.current = sala; geralRef.current = geralId;

  const carregar = useCallback(async () => {
    const [n, p] = await Promise.all([getSb().rpc('nao_lidas'), getSb().rpc('meus_pedidos_recebidos')]);
    if (!n.error && n.data) {
      const m = {};
      n.data.forEach((x) => { if (x.sala_id !== salaRef.current) m[x.sala_id] = Number(x.total); });
      setMapa(m);
    }
    if (!p.error && p.data) { setPedidos(p.data.length); return p.data; }
    return null;
  }, [getSb]);

  // Ao abrir uma conversa (ou a comunidade), ela passa a contar como lida.
  useEffect(() => {
    if (!sala) return;
    setMapa((m) => (m[sala] ? { ...m, [sala]: 0 } : m));
    getSb().rpc('marcar_lida', { sl: sala });
  }, [sala, getSb]);

  useEffect(() => {
    let canal; let vivo = true;
    (async () => {
      const { data: { user } } = await getSb().auth.getUser();
      if (!user || !vivo) return;
      eu.current = user.id;
      const { data: g } = await getSb().from('chat_salas').select('id').eq('tipo', 'geral').maybeSingle();
      if (g && vivo) setGeralId(g.id);
      await carregar();
      if (!vivo) return;
      canal = getSb().channel('aviso-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => {
          const m = p.new;
          if (!m || m.autor_id === eu.current) return;
          if (m.sala_id === salaRef.current) { getSb().rpc('marcar_lida', { sl: m.sala_id }); return; }
          setMapa((x) => ({ ...x, [m.sala_id]: (x[m.sala_id] || 0) + 1 }));
          avisar({ id: m.id || Date.now(), titulo: 'Nova mensagem', hora: hora(m.criado_em), texto: String(m.texto || '').slice(0, 90), href: `/app/chat/${m.sala_id}` });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversa_pedidos', filter: `para=eq.${user.id}` }, async () => {
          const lista = await carregar();
          const novo = lista?.[0];
          avisar({ id: Date.now(), titulo: 'Pedido para conversar', hora: hora(), texto: novo ? `${novo.nome} quer conversar com você` : 'Você recebeu um pedido', href: '/app/chat' });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jogos_convites', filter: `para=eq.${user.id}` }, async (p) => {
          const c = p.new;
          const { data: v } = await getSb().rpc('ver_convite', { p_id: c.id });
          const nome = v?.[0]?.de_nome || 'Um amigo';
          avisar({ id: c.id, titulo: 'Convite para jogar', hora: hora(), texto: `${nome} te chamou para jogar ${({ memoria: 'Memória', xadrez: 'Xadrez', paciencia: 'Paciência', cacapalavras: 'Caça-palavras' })[c.jogo] || 'Truco'}`, href: `/app/jogos?convite=${c.id}` });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'imp_convites', filter: `para=eq.${user.id}` }, (p) => {
          const c = p.new;
          avisar({ id: c.id, titulo: 'Convite: Quem é o Impostor?', hora: hora(), texto: `Você foi chamado para “${c.sala_nome || 'uma sala'}”. Toque para entrar!`, href: `/app/impostor?sala=${c.codigo}` });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jogos_alta' }, (p) => {
          const j = p.new;
          if (!j || window.__panthuJogando === j.jogo) return;
          const nomes = { xadrez: 'Xadrez', truco: 'Truco', memoria: 'Memória', paciencia: 'Paciência', cacapalavras: 'Caça-palavras' };
          avisar({ id: j.id, titulo: `${nomes[j.jogo] || 'Um jogo'} está em alta!`, hora: hora(), texto: `Tem ${j.jogadores} pessoas jogando agora. Entre para jogar!`, href: `/app/jogos?jogo=${j.jogo}` });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pontos_cupons', filter: `usuario_id=eq.${user.id}` }, () => {
          avisar({ id: Date.now(), titulo: 'Você ganhou um brinde! 🎁', hora: hora(), texto: 'Seu cupom de brinde já está disponível.', href: '/app/pontos' });
        })
        .subscribe();
    })();
    const voltou = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', voltou);
    return () => { vivo = false; document.removeEventListener('visibilitychange', voltou); if (canal) getSb().removeChannel(canal); };
  }, [getSb, carregar]);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);

  const nao = Object.values(mapa).reduce((a, b) => a + b, 0) + pedidos;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s/, '');
    document.title = nao > 0 ? `(${nao > 9 ? '9+' : nao}) ${base}` : base;
  }, [nao]);
  return { nao, aviso, fechar: () => setAviso(null) };
}
