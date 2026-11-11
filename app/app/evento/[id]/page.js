import { notFound } from 'next/navigation';
import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import ConfirmarBotao from '@/components/ConfirmarBotao';
import Pessoas from '@/components/Pessoas';
import Avatar from '@/components/Avatar';
import AtualizarSozinho from '@/components/AtualizarSozinho';
import AvaliarEvento from '@/components/AvaliarEvento';
export const dynamic = 'force-dynamic';
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const preco = (v) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export default async function Evento({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: e } = await sb.from('eventos')
    .select('*, estabelecimentos(id, nome, descricao, logo_url, endereco, latitude, longitude, contato, redes)').eq('id', id).single();
  if (!e) notFound();
  const est = e.estabelecimentos;
  const { data: conf } = await sb.from('confirmacoes').select('status').eq('evento_id', id).eq('usuario_id', user.id).maybeSingle();
  const confirmado = ['confirmado', 'presente'].includes(conf?.status);
  const { data: total } = await sb.rpc('total_confirmados', { ev: id });
  const { data: lista } = await sb.rpc('lista_presenca', { ev: id });
  const { data: sala } = confirmado ? await sb.from('chat_salas').select('id').eq('evento_id', id).eq('tipo', 'evento').maybeSingle() : { data: null };
  const { data: mesa } = confirmado ? await sb.rpc('minha_mesa', { p_evento: id }) : { data: null };
  const { data: cardapio } = est ? await sb.from('cardapio_categorias')
    .select('nome, ordem, cardapio_itens(id, nome, descricao, preco, beneficio_panthu, disponivel)')
    .eq('estabelecimento_id', est.id).order('ordem') : { data: [] };
  const podeAvaliar = confirmado && new Date(e.inicio) <= new Date();
  const { data: minhaAval } = podeAvaliar ? await sb.from('avaliacoes').select('nota_geral, organizacao, estrutura, interacao, comentario').eq('evento_id', id).eq('usuario_id', user.id).maybeSingle() : { data: null };
  const mapa = est?.latitude ? `https://www.openstreetmap.org/?mlat=${est.latitude}&mlon=${est.longitude}#map=17/${est.latitude}/${est.longitude}` : null;

  return (<>
    {confirmado && <AtualizarSozinho segundos={20} />}
    <p><Link href="/app">← Eventos</Link></p>
    <div className="card evento">
      <div className="banner">
        {e.banner_url && <img className="capa" src={e.banner_url} alt="" />}
        <h1 style={{ fontSize: 32 }}>{e.nome}</h1><div>{quando(e.inicio)}</div>
        <div className="local">
          <div className="logo-local">{est?.logo_url ? <img src={est.logo_url} alt={`Logo ${est.nome}`} /> : 'logo'}</div>
          <div><b>{est?.nome || 'Local a definir'}</b><br /><small>{est?.endereco}</small></div>
        </div>
      </div>
      <div className="corpo">
        <div><span className="tag ok">{total ?? 0}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</span>{confirmado && <span className="tag ok">Você vai!</span>}{conf?.status === 'presente' && <span className="tag ok">Presença registrada</span>}</div>
        {e.descricao && <p>{e.descricao}</p>}
        <ConfirmarBotao eventoId={id} usuarioId={user.id} confirmado={confirmado} />
        {sala && <Link className="btn s" href={`/app/chat/${sala.id}`}>Abrir chat do evento</Link>}
        {mapa && <a className="btn o" href={mapa} target="_blank" rel="noopener noreferrer">Ver no mapa</a>}
      </div>
    </div>
    {podeAvaliar && <AvaliarEvento eventoId={id} usuarioId={user.id} inicial={minhaAval} />}
    {mesa && mesa.length > 0 && (
      <div className="card" style={{ borderColor: 'var(--ouro)', borderWidth: 2 }}>
        <p style={{ margin: 0, color: 'var(--suave)' }}>Rodada {mesa[0].rodada_numero}</p>
        <h2 style={{ fontSize: 28 }}>{mesa[0].mesa_nome}</h2>
        {mesa[0].orientacao && <p style={{ whiteSpace: 'pre-line' }}>{mesa[0].orientacao}</p>}
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {mesa.map(m => (
            <Link key={m.usuario_id} className="pessoa-link" href={`/app/pessoa/${m.usuario_id}`}><Avatar url={m.foto_url} nome={m.nome} tam={32} />{m.nome}</Link>
          ))}
        </div>
      </div>
    )}
    {e.orientacoes && <div className="card"><h3>Orientações</h3><p style={{ whiteSpace: 'pre-line' }}>{e.orientacoes}</p></div>}
    <div className="card">
      <h3>Quem vai</h3>
      {confirmado && lista?.length
        ? <Pessoas lista={lista} euId={user.id} />
        : <p style={{ color: 'var(--suave)' }}>{confirmado ? 'Você é o primeiro a confirmar!' : 'Confirme sua presença para ver quem vai.'}</p>}
    </div>
    <div className="card">
      <h3>Cardápio</h3>
      {(!cardapio || cardapio.length === 0) && <p style={{ color: 'var(--suave)' }}>O cardápio deste local ainda não foi cadastrado.</p>}
      {(cardapio || []).map(c => (<div key={c.nome} style={{ marginTop: 14 }}>
        <b>{c.nome}</b>
        {c.cardapio_itens.filter(i => i.disponivel).map(i => (
          <div className="item" key={i.id}><span>{i.nome}<small>{i.descricao}</small>{i.beneficio_panthu && <span className="tag ok">{i.beneficio_panthu}</span>}</span><b>{preco(i.preco)}</b></div>
        ))}
      </div>))}
    </div>
  </>);
}
