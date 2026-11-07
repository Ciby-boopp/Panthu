import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
export default async function Lista() {
  const sb = await criarServidor();
  const { data } = await sb.from('eventos').select('id, nome, inicio, capacidade, publicado, estabelecimentos(nome)').order('inicio', { ascending: false });
  const totais = await Promise.all((data || []).map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));
  return (<>
    <div className="linha"><h1 style={{ fontSize: 30 }}>Eventos</h1><Link className="btn p" href="/admin/eventos/novo">+ Novo</Link></div>
    {(!data || !data.length) && <div className="card vazio"><h3>Nenhum evento ainda</h3><p>Crie o primeiro encontro.</p></div>}
    {(data || []).map((e, i) => (
      <Link key={e.id} href={`/admin/eventos/${e.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <b>{e.nome}</b> <span className={`tag ${e.publicado ? 'ok' : ''}`}>{e.publicado ? 'publicado' : 'rascunho'}</span><br />
        <small style={{ color: 'var(--suave)' }}>{quando(e.inicio)} · {e.estabelecimentos?.nome || 'local a definir'} · {totais[i]}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</small>
      </Link>
    ))}
  </>);
}
