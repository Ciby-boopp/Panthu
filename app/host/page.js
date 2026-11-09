import Topo from '@/components/Topo';
import { criarServidor } from '@/lib/supabase/server';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
export default async function Host() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  const admin = p.papel === 'admin';
  const { data: pm } = admin ? { data: null } : await sb.from('host_permissoes').select('*').eq('host_id', user.id).maybeSingle();
  const perm = admin ? { ver_participantes: true, gerenciar_mesas: true, ver_dinamicas: true, registrar_ocorrencias: true } : (pm || {});
  let eventos = [];
  if (admin) {
    ({ data: eventos } = await sb.from('eventos').select('id, nome, inicio, capacidade, orientacoes, estabelecimentos(nome)').order('inicio', { ascending: false }));
  } else {
    const { data: v } = await sb.from('evento_hosts').select('evento_id').eq('host_id', user.id);
    const ids = (v || []).map(x => x.evento_id);
    if (ids.length) ({ data: eventos } = await sb.from('eventos').select('id, nome, inicio, capacidade, orientacoes, estabelecimentos(nome)').in('id', ids).order('inicio', { ascending: false }));
  }
  eventos = eventos || [];
  const listas = await Promise.all(eventos.map(async e => perm.ver_participantes ? ((await sb.rpc('lista_presenca', { ev: e.id })).data || []) : []));
  const totais = await Promise.all(eventos.map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));
  return (<><Topo papel={p.papel} /><main>
    <h1 style={{ fontSize: 32 }}>Área do Host</h1>
    <p>{[['ver_participantes', 'Participantes'], ['gerenciar_mesas', 'Mesas'], ['ver_dinamicas', 'Dinâmicas'], ['registrar_ocorrencias', 'Ocorrências']]
      .map(([k, t]) => <span key={k} className={`tag ${perm[k] ? 'ok' : ''}`}>{t}: {perm[k] ? 'sim' : 'não'}</span>)}</p>
    {eventos.length === 0 && <div className="card vazio"><h3>Nenhum evento vinculado a você</h3><p>O administrador define os eventos sob a sua responsabilidade.</p></div>}
    {eventos.map((e, i) => (<div className="card" key={e.id}>
      <h3>{e.nome}</h3>
      <p>{quando(e.inicio)} · {e.estabelecimentos?.nome || 'local a definir'} · {totais[i]}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</p>
      {e.orientacoes && <p style={{ whiteSpace: 'pre-line', color: 'var(--suave)' }}>{e.orientacoes}</p>}
      {perm.ver_participantes
        ? <div className="pessoas">{listas[i].map(x => <div className="pessoa" key={x.usuario_id}><i>{x.inicial}</i>{x.nome}</div>)}</div>
        : <p style={{ color: 'var(--suave)' }}>Você não tem permissão para ver a lista de participantes.</p>}
    </div>))}
  </main></>);
}
