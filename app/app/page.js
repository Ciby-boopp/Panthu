import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import Icone from '@/components/Icone';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Início' };

const dia = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' });
const mes = (d) => new Date(d).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '');

export default async function Inicio() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('nome').eq('id', user.id).single();
  const { data: eventos } = await sb.from('eventos').select('id, nome, inicio, banner_url, estabelecimentos(nome)').gte('inicio', new Date().toISOString()).order('inicio').limit(3);
  const { data: pessoas } = await sb.rpc('pessoas_para_jogar');
  const lista = eventos || [];
  return (<div className="pag-larga">
    <header className="ini-saudacao">
      <h1>Olá, {perfil?.nome?.split(' ')[0] || 'bem-vindo'}! <span aria-hidden="true">👋</span></h1>
      <p>Que bom ter você por aqui!</p>
    </header>
    <form action="/app/eventos" method="get" className="busca" role="search">
      <Icone nome="busca" />
      <input type="search" name="q" placeholder="Buscar eventos, pessoas…" aria-label="Buscar eventos" />
    </form>
    <section className="ini-hero" aria-label="Destaque">
      <div>
        <h2>Encontre eventos perto de você!</h2>
        <p>Faça novas conexões e aproveite cada momento.</p>
        <Link className="btn ouro" href="/app/proximo">Explorar →</Link>
      </div>
    </section>
    <div className="linha ini-sec"><h2>Eventos em destaque</h2><Link href="/app/eventos">Ver todos →</Link></div>
    {lista.length === 0 ? <div className="card vazio">Nenhum encontro marcado ainda. Assim que houver um, ele aparece aqui.</div> : lista.map((e) => (
      <Link key={e.id} href={`/app/evento/${e.id}`} className="ev-card ev-mini" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="ev-link">
          <span className="ev-thumb" style={{ width: 84 }}>{e.banner_url ? <img loading="lazy" decoding="async" src={e.banner_url} alt="" /> : <span className="ev-sem">🎉</span>}<span className="selo-data" aria-hidden="true"><small>{mes(e.inicio)}</small><b>{dia(e.inicio)}</b></span></span>
          <span className="ev-info"><h3>{e.nome}</h3><span className="ev-linha"><Icone nome="local" />{e.estabelecimentos?.nome || 'Local a definir'}</span></span>
        </span>
      </Link>
    ))}
    <div className="linha ini-sec"><h2>Suas conexões</h2><Link href="/app/amigos">Ver todos →</Link></div>
    {(pessoas || []).length === 0 ? <div className="card vazio">Salve amigos ou converse com alguém para vê-los aqui.</div> : (
      <div className="ini-pessoas">
        {pessoas.slice(0, 8).map((p) => (
          <Link key={p.id} href={`/app/pessoa/${p.id}`} className="ini-pessoa"><Avatar url={p.foto_url} nome={p.nome} tam={64} /><b>{p.nome}</b></Link>
        ))}
      </div>
    )}
    <Link href="/app/jogos" className="ini-jogos"><span aria-hidden="true">🏆</span><span><b>Desafie seus amigos!</b><small>Jogue, ganhe pontos e brindes na comunidade.</small></span></Link>
  </div>);
}
