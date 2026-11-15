import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import FavoritoBotao from '@/components/FavoritoBotao';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Favoritos' };
const GRUPOS = [['evento', 'Eventos', (i) => `/app/evento/${i}`], ['grupo', 'Grupos', (i) => `/app/chat/${i}`], ['pessoa', 'Pessoas', (i) => `/app/pessoa/${i}`], ['estabelecimento', 'Estabelecimentos', null]];
export default async function Page() {
  const sb = await criarServidor();
  const { data, error } = await sb.rpc('meus_favoritos');
  const lista = data || [];
  return (<>
    <p><Link href="/app/perfil">← Perfil</Link></p>
    <h1 style={{ fontSize: 32 }}>Meus favoritos</h1>
    <p style={{ color: 'var(--suave)' }}>Toque na estrela de um evento, grupo, pessoa ou estabelecimento para guardar aqui.</p>
    {error && <p className="msg erro">Favoritos indisponíveis. Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.</p>}
    {!error && lista.length === 0 && <div className="card vazio">Você ainda não salvou nada.</div>}
    {GRUPOS.map(([tipo, nome, href]) => {
      const itens = lista.filter((x) => x.tipo === tipo);
      if (!itens.length) return null;
      return (
        <section className="card" key={tipo} aria-label={nome}>
          <h3>{nome}</h3>
          {itens.map((f) => {
            const corpo = (<span className="lista-item">{(tipo === 'pessoa' || f.foto_url) && <Avatar url={f.foto_url} nome={f.titulo} tam={42} />}<span><b>{f.titulo}</b>{f.subtitulo && <small>{f.subtitulo}</small>}</span></span>);
            return (<div className="item" key={f.item_id} style={{ alignItems: 'center' }}>
              {href ? <Link href={href(f.item_id)} style={{ textDecoration: 'none', color: 'inherit' }}>{corpo}</Link> : corpo}
              <FavoritoBotao tipo={tipo} id={f.item_id} inicial compacto rotulo={f.titulo} />
            </div>);
          })}
        </section>
      );
    })}
  </>);
}
