import Topo from '@/components/Topo';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Host() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  const { data: eventos } = await sb.from('eventos').select('id, nome, inicio, capacidade').order('inicio', { ascending: false });
  const listas = await Promise.all((eventos || []).map(async e => (await sb.rpc('lista_presenca', { ev: e.id })).data || []));
  return (<><Topo papel={p.papel} /><main>
    <h1 style={{ fontSize: 32 }}>Área do Host</h1>
    {(!eventos || !eventos.length) && <div className="card vazio"><h3>Nenhum evento vinculado a você</h3><p>O administrador define os eventos sob sua responsabilidade.</p></div>}
    {(eventos || []).map((e, i) => (<div className="card" key={e.id}>
      <h3>{e.nome}</h3>
      <p>{new Date(e.inicio).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })} · {listas[i].length}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</p>
      <div className="pessoas">{listas[i].map(x => <div className="pessoa" key={x.usuario_id}><i>{x.inicial}</i>{x.nome}</div>)}</div>
    </div>))}
  </main></>);
}
