import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import Planejamento from '@/components/admin/v3/Planejamento';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planejamento e agenda' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['metas', 'tarefas', 'agenda'], 'metas');
  const tipo = { metas: 'meta', tarefas: 'tarefa', agenda: 'agenda' }[aba];
  const sb = await criarServidor();
  const { data, error } = await sb.from('adm_tarefas').select('id, tipo, titulo, descricao, prazo, status').eq('tipo', tipo).order('prazo', { ascending: true, nullsFirst: false });
  const { data: eventos } = aba === 'agenda' ? await sb.from('eventos').select('id, nome, inicio').gte('inicio', new Date().toISOString()).order('inicio').limit(10) : { data: [] };
  return (<>
    <h1 style={{ fontSize: 30 }}>Planejamento e agenda</h1>
    <AdmAbas base="/admin/planejamento" itens={[['metas', 'Metas'], ['tarefas', 'Tarefas'], ['agenda', 'Agenda e eventos']]} ativo={aba} />
    <Aviso erro={error} />
    {!error && <Planejamento tipo={tipo} itens={data || []} />}
    {aba === 'agenda' && <section className="card"><h3>Próximos eventos</h3>{(eventos || []).length === 0 ? <p className="vazio">Nenhum evento marcado.</p> : eventos.map((e) => <div className="item" key={e.id}><Link href={`/admin/eventos/${e.id}`}>{e.nome}</Link><small>{dataHora(e.inicio)}</small></div>)}</section>}
  </>);
}
