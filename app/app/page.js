import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default async function Eventos() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('nome').eq('id', user.id).single();
  const { data: eventos } = await sb.from('eventos')
    .select('id, nome, inicio, banner_url, capacidade, estabelecimentos(nome, logo_url)')
    .gte('inicio', new Date().toISOString()).order('inicio');
  const { data: minhas } = await sb.from('confirmacoes').select('evento_id').eq('usuario_id', user.id).in('status', ['confirmado', 'presente']);
  const meus = new Set((minhas || []).map(c => c.evento_id));
  const totais = await Promise.all((eventos || []).map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));

  return (<>
    <h1 style={{ fontSize: 32 }}>Oi, {perfil?.nome?.split(' ')[0]}!</h1>
    <p style={{ color: 'var(--suave)' }}>Próximos encontros</p>
    {(!eventos || eventos.length === 0) && <div className="card vazio"><h3>Nenhum encontro marcado ainda</h3><p>Assim que um novo encontro for publicado, ele aparece aqui.</p></div>}
    {(eventos || []).map((e, i) => (
      <Link key={e.id} href={`/app/evento/${e.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="card evento">
          <div className="banner">
            {e.banner_url && <img className="capa" src={e.banner_url} alt="" />}
            <h3>{e.nome}</h3><div>{quando(e.inicio)}</div>
            <div className="local">
              <div className="logo-local">{e.estabelecimentos?.logo_url ? <img src={e.estabelecimentos.logo_url} alt="" /> : 'logo'}</div>
              <b>{e.estabelecimentos?.nome || 'Local a definir'}</b>
            </div>
          </div>
          <div className="corpo">
            <div>{meus.has(e.id) && <span className="tag ok">Presença confirmada</span>}
              <span className="tag">{totais[i]}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</span></div>
            {e.capacidade && <div className="barra"><i style={{ width: `${Math.min(100, (totais[i] / e.capacidade) * 100)}%` }} /></div>}
          </div>
        </div>
      </Link>
    ))}
  </>);
}
