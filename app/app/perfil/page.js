import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Icone from '@/components/Icone';
import { criarServidor } from '@/lib/supabase/server';
import PerfilForm from '@/components/PerfilForm';
import NotificacoesPush from '@/components/NotificacoesPush';
import BoasVindas from '@/components/BoasVindas';
import Acessibilidade from '@/components/Acessibilidade';
import MeusDados from '@/components/MeusDados';
import { quando } from '@/lib/util';
import '@/components/chat.css';
export const dynamic = 'force-dynamic';
const rotulo = { confirmado: 'Confirmado', cancelado: 'Cancelado', presente: 'Participou' };
export default async function Perfil() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('id, nome, telefone, email, foto_url, bio').eq('id', user.id).single();
  const { data: extra } = await sb.from('perfis').select('cidade, interesses, hobbies, procura').eq('id', user.id).single();
  const { data: resumo } = await sb.rpc('pontos_resumo');
  const pts = resumo?.[0];
  const [{ count: nAmigos }, { count: nEventos }] = await Promise.all([
    sb.from('amigos').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
    sb.from('confirmacoes').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id).in('status', ['confirmado', 'presente']),
  ]);
  const { data: hist } = await sb.from('confirmacoes').select('status, eventos(id, nome, inicio)').eq('usuario_id', user.id).order('criado_em', { ascending: false });
  return (<>
    <div className="pf-topo">
      <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar url={perfil?.foto_url} nome={perfil?.nome} tam={96} /></div>
      <h1>{perfil?.nome}</h1>
      <div className="pf-stats"><div><b>{nAmigos || 0}</b><small>Conexões</small></div><div><b>{nEventos || 0}</b><small>Eventos</small></div><div><b>{pts ? pts.total : 0}</b><small>Pontos</small></div></div>
      <a className="btn o" style={{ width: '100%' }} href="#editar"><Icone nome="perfil" />Editar perfil</a>
    </div>
    <nav className="card pf-menu" aria-label="Atalhos do perfil">
      <a href="#historico"><Icone nome="eventos" />Minhas participações</a>
      <Link href="/app/favoritos"><Icone nome="check" />Favoritos</Link>
      <Link href="/app/amigos"><Icone nome="usuarios" />Meus amigos</Link>
      <Link href="/app/pontos"><Icone nome="jogos" />Meus pontos e brindes</Link>
      <Link href="/app/convidar"><Icone nome="enviar" />Convidar amigos</Link>
      <Link href={`/app/pessoa/${user.id}`}><Icone nome="busca" />Ver como os outros me veem</Link>
    </nav>
    <div id="editar" />
    <PerfilForm perfil={perfil} />
    {extra && <BoasVindas perfil={{ id: user.id, ...extra }} editar />}
    <NotificacoesPush />
    <Acessibilidade />
    <MeusDados />
    <div className="card" id="historico"><h3>Meu histórico</h3>
      {(!hist || !hist.length) && <p style={{ color: 'var(--suave)' }}>Você ainda não confirmou presença em nenhum encontro.</p>}
      {(hist || []).filter(h => h.eventos).map((h, i) => (
        <div className="item" key={i}><span><Link href={`/app/evento/${h.eventos.id}`}>{h.eventos.nome}</Link><small>{quando(h.eventos.inicio)}</small></span>
          <span className={`tag ${h.status !== 'cancelado' ? 'ok' : ''}`}>{rotulo[h.status] || h.status}</span></div>
      ))}
    </div>
  </>);
}
