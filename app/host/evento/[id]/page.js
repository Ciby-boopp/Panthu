import Link from 'next/link';
import { notFound } from 'next/navigation';
import Topo from '@/components/Topo';
import GestaoEvento from '@/components/GestaoEvento';
import { criarServidor } from '@/lib/supabase/server';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
export default async function GerirEvento({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  const [pp, pm] = await Promise.all([
    sb.rpc('host_pode', { ev: id, perm: 'participantes' }),
    sb.rpc('host_pode', { ev: id, perm: 'mesas' })
  ]);
  const perms = { participantes: !!pp.data, mesas: !!pm.data };
  if (!perms.participantes && !perms.mesas) notFound();
  const { data: ev } = await sb.from('eventos').select('id, nome, inicio, orientacoes').eq('id', id).single();
  if (!ev) notFound();
  const { data: lista } = perms.participantes ? await sb.rpc('lista_gestao', { ev: id }) : { data: [] };
  const { data: mesas } = await sb.from('mesas').select('id, nome, lugares').eq('evento_id', id).order('nome');
  const { data: rodadas } = await sb.from('rodadas').select('id, numero, orientacao, ativa').eq('evento_id', id).order('numero');
  const atrib = {};
  if (perms.mesas) {
    await Promise.all((rodadas || []).map(async r => { atrib[r.id] = (await sb.rpc('mesas_da_rodada', { p_rodada: r.id })).data || []; }));
  }
  return (<><Topo papel={p.papel} /><main>
    <p><Link href={p.papel === 'admin' ? `/admin/eventos/${id}` : '/host'}>← Voltar</Link></p>
    <h1 style={{ fontSize: 28 }}>{ev.nome}</h1>
    <p style={{ color: 'var(--suave)' }}>{quando(ev.inicio)}</p>
    <GestaoEvento eventoId={id} perms={perms} lista={lista || []} mesas={mesas || []} rodadas={rodadas || []} atrib={atrib} />
  </main></>);
}
