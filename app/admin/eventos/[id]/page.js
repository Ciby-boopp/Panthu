import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import EventoForm from '@/components/admin/EventoForm';
export const dynamic = 'force-dynamic';
export default async function Editar({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: ev } = await sb.from('eventos').select('*').eq('id', id).single();
  if (!ev) notFound();
  const { data: locais } = await sb.from('estabelecimentos').select('id, nome').eq('ativo', true).order('nome');
  const { data: lista } = await sb.rpc('lista_presenca', { ev: id });
  return (<>
    <h1 style={{ fontSize: 30 }}>{ev.nome}</h1>
    <EventoForm inicial={ev} locais={locais || []} />
    <div className="card"><h3>Confirmados ({lista?.length || 0})</h3>
      {lista?.length ? <div className="pessoas" style={{ marginTop: 10 }}>{lista.map(p => <div className="pessoa" key={p.usuario_id}><i>{p.inicial}</i>{p.nome}</div>)}</div>
        : <p style={{ color: 'var(--suave)' }}>Ninguém confirmou ainda.</p>}
    </div>
  </>);
}
