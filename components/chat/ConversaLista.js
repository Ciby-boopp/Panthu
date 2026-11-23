'use client';
import CriarGrupo from '../CriarGrupo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from '../Avatar';
import Icone from '../Icone';
import PedidosRecebidos from '../PedidosRecebidos';

const ABAS = [['todas', 'Todas'], ['grupos', 'Grupos'], ['diretas', 'Diretas']];
const TZ = 'America/Sao_Paulo';

function rotuloHora(iso) {
  if (!iso) return '';
  const d = new Date(iso), agora = new Date();
  const dia = (x) => x.toLocaleDateString('en-CA', { timeZone: TZ });
  if (dia(d) === dia(agora)) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  if (dia(d) === dia(new Date(agora.getTime() - 864e5))) return 'Ontem';
  if ((agora - d) / 864e5 < 7) {
    const s = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: TZ }).replace('.', '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
}

export default function ConversaLista({ ativo }) {
  const sbRef = useRef(null);
  const getSb = useCallback(() => (sbRef.current ||= criarCliente()), []);
  const [itens, setItens] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [geralId, setGeralId] = useState(null);
  const [temas, setTemas] = useState([]);
  const [aba, setAba] = useState('todas');
  const [q, setQ] = useState('');
  const eu = useRef(null);
  const espera = useRef(null);

  const carregar = useCallback(async () => {
    try {
      if (!eu.current) { const { data: { user } } = await getSb().auth.getUser(); eu.current = user?.id || null; }
      const [g, c, n, p] = await Promise.all([
        getSb().from('chat_salas').select('id, nome').eq('tipo', 'geral').maybeSingle(),
        getSb().rpc('minhas_conversas'), getSb().rpc('nao_lidas'), getSb().rpc('meus_pedidos_recebidos')
      ]);
      // Grupos temáticos (se o SQL ainda não foi rodado, a lista simplesmente não aparece)
      getSb().rpc('grupos_lista').then(({ data }) => setTemas(data || []), () => {});
      const geral = g.data;
      setGeralId(geral?.id || null);
      const nao = {};
      (n.data || []).forEach(x => { nao[x.sala_id] = Number(x.total); });
      const salas = [];
      if (geral) salas.push({ id: geral.id, titulo: geral.nome || 'Comunidade', tipo: 'geral', ultima: null });
      (c.data || []).forEach(x => { if (x.sala_id !== geral?.id) salas.push({ id: x.sala_id, titulo: x.titulo, tipo: x.tipo, ultima: x.ultima }); });
      const ult = await Promise.all(salas.map(s =>
        getSb().from('mensagens').select('texto, autor_id, criado_em').eq('sala_id', s.id).order('criado_em', { ascending: false }).limit(1)));
      const lista = salas.map((s, i) => {
        const m = ult[i].data?.[0];
        return { ...s, previa: m ? `${m.autor_id === eu.current ? 'Você: ' : ''}${m.texto}` : '', quando: m?.criado_em || s.ultima, nao: nao[s.id] || 0 };
      }).sort((a, b) => (a.tipo === 'geral' ? -1 : b.tipo === 'geral' ? 1 : new Date(b.quando || 0) - new Date(a.quando || 0)));
      setItens(lista);
      setPedidos(p.data || []);
    } catch { setItens(v => v || []); }
  }, [getSb]);

  useEffect(() => {
    carregar();
    const agendar = () => { clearTimeout(espera.current); espera.current = setTimeout(carregar, 600); };
    const canal = getSb().channel('lista-conversas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, agendar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversa_pedidos' }, agendar)
      .subscribe();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 30000);
    return () => { clearTimeout(espera.current); clearInterval(t); getSb().removeChannel(canal); };
  }, [getSb, carregar]);

  // Ao abrir uma conversa ela passa a contar como lida; recarrega logo depois para zerar o selo.
  useEffect(() => { const t = setTimeout(carregar, 1200); return () => clearTimeout(t); }, [ativo, carregar]);

  const idAtivo = ativo || geralId;
  const visiveis = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return (itens || []).filter(i =>
      (aba === 'todas' || (aba === 'grupos' ? ['geral', 'evento'].includes(i.tipo) : !['geral', 'evento'].includes(i.tipo))) &&
      (!termo || `${i.titulo} ${i.previa}`.toLowerCase().includes(termo)));
  }, [itens, aba, q]);

  return (<>
    <div className="conv-cab"><h2>Conversas</h2></div>
    <div className="conv-busca busca">
      <Icone nome="busca" />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conversas" aria-label="Buscar conversas" />
    </div>
    <div className="conv-tabs" role="tablist" aria-label="Tipo de conversa">
      {ABAS.map(([v, t]) => <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}>{t}</button>)}
    </div>
    <div className="conv-rol">
      {(aba === 'todas' || aba === 'grupos') && !q.trim() && temas.length > 0 && (
        <div className="temas" aria-label="Grupos para conversar">
          <p className="conv-nota" style={{ margin: '4px 0' }}><b>Grupos para conversar</b></p>
          <CriarGrupo />
          {temas.map((t) => (
            <Link key={t.id} href={`/app/chat/tema/${t.slug}`} className="conv-item">
              <span className="conv-ico" aria-hidden="true" style={{ fontSize: 22 }}>{t.emoji}</span>
              <span className="conv-corpo">
                <span className="conv-linha"><span className="conv-titulo">{t.nome}</span></span>
                <span className="conv-linha"><span className="conv-previa">{t.participo ? `${t.membros} no grupo` : 'Toque para entrar'}</span>
                  {Number(t.novas) > 0 && <span className="conv-badge" aria-label={`${t.novas} mensagens novas`}>{Number(t.novas) > 99 ? '99+' : Number(t.novas)}</span>}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <PedidosRecebidos key={pedidos.map(p => p.id).join(',')} lista={pedidos} />
      {itens === null && <p className="conv-nota">Carregando conversas…</p>}
      {itens !== null && visiveis.length === 0 && (
        <p className="conv-nota">{q ? 'Nenhuma conversa encontrada.' : aba === 'diretas'
          ? 'Nenhuma conversa privada ainda. Toque em Conversar no perfil de quem vai ao mesmo evento que você.'
          : aba === 'grupos' ? 'Nenhum grupo ainda. Confirme presença em um encontro para entrar no chat dele.' : 'Nenhuma conversa ainda.'}</p>
      )}
      {visiveis.map(i => {
        const nao = String(i.id) === String(idAtivo) ? 0 : i.nao;
        return (
          <Link key={i.id} href={`/app/chat/${i.id}`} className="conv-item" aria-current={i.id === idAtivo ? 'page' : undefined}>
            {i.tipo === 'geral' || i.tipo === 'evento'
              ? <span className="conv-ico" aria-hidden="true"><Icone nome="usuarios" /></span>
              : <Avatar nome={i.titulo} tam={44} />}
            <span className="conv-corpo">
              <span className="conv-linha"><span className="conv-titulo">{i.titulo}</span><span className="conv-hora">{rotuloHora(i.quando)}</span></span>
              <span className="conv-linha"><span className="conv-previa">{i.previa || 'Sem mensagens ainda'}</span>
                {nao > 0 && <span className="conv-badge" aria-label={`${nao} mensagens novas`}>{nao > 99 ? '99+' : nao}</span>}</span>
            </span>
          </Link>
        );
      })}
    </div>
  </>);
}
