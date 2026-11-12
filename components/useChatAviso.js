'use client';
import { useEffect, useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const CHAVE = 'panthu-nao-lidas';
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } };
const gravar = (m) => { try { localStorage.setItem(CHAVE, JSON.stringify(m)); } catch {} };
const hora = (d) => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// Escuta mensagens novas enquanto o app está aberto: conta as não lidas (por sala) e mostra um aviso com o horário.
export default function useChatAviso(path) {
  const [mapa, setMapa] = useState({});
  const [aviso, setAviso] = useState(null);
  const [geralId, setGeralId] = useState(null);
  const eu = useRef(null), pathRef = useRef(path), geralRef = useRef(null);
  pathRef.current = path; geralRef.current = geralId;

  useEffect(() => { setMapa(ler()); }, []);

  // Ao abrir uma sala (ou a lista, no caso da comunidade), zera o contador dela.
  useEffect(() => {
    const m = ler(); let mudou = false;
    const sala = path.match(/^\/app\/chat\/([^/]+)/)?.[1];
    if (sala && m[sala]) { delete m[sala]; mudou = true; }
    if (path === '/app/chat' && geralId && m[geralId]) { delete m[geralId]; mudou = true; }
    if (mudou) { gravar(m); setMapa(m); }
  }, [path, geralId]);

  useEffect(() => {
    const sb = criarCliente(); let canal; let vivo = true;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !vivo) return;
      eu.current = user.id;
      const { data: g } = await sb.from('chat_salas').select('id').eq('tipo', 'geral').maybeSingle();
      if (g && vivo) setGeralId(g.id);
      canal = sb.channel('aviso-chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => {
        const m = p.new;
        if (!m || m.autor_id === eu.current) return;
        const aqui = pathRef.current;
        if (aqui === `/app/chat/${m.sala_id}` || (aqui === '/app/chat' && m.sala_id === geralRef.current)) return;
        const atual = ler(); atual[m.sala_id] = (atual[m.sala_id] || 0) + 1; gravar(atual); setMapa({ ...atual });
        setAviso({ id: m.id || Date.now(), hora: hora(m.criado_em || m.created_at), texto: String(m.texto || '').slice(0, 90), href: m.sala_id === geralRef.current ? '/app/chat' : `/app/chat/${m.sala_id}` });
      }).subscribe();
    })();
    return () => { vivo = false; if (canal) sb.removeChannel(canal); };
  }, []);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);

  const nao = Object.values(mapa).reduce((a, b) => a + b, 0);
  return { nao, aviso, fechar: () => setAviso(null) };
}
