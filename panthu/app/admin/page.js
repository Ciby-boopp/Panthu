import Topo from '@/components/Topo';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Admin() {
  const sb = await criarServidor();
  const conta = async (tabela, filtro) => { let q = sb.from(tabela).select('*', { count: 'exact', head: true }); if (filtro) q = filtro(q); return (await q).count ?? 0; };
  const [part, ativos, evs, conf, est, den] = await Promise.all([
    conta('perfis'), conta('perfis', q => q.eq('ativo', true).eq('bloqueado', false)),
    conta('eventos'), conta('confirmacoes', q => q.eq('status', 'confirmado')),
    conta('estabelecimentos'), conta('denuncias', q => q.eq('status', 'aberta'))
  ]);
  const cards = [['Cadastrados', part], ['Ativos', ativos], ['Eventos', evs], ['Confirmações', conf], ['Estabelecimentos', est], ['Denúncias abertas', den]];
  return (<><Topo papel="admin" /><main>
    <h1 style={{ fontSize: 32 }}>Painel ADM</h1>
    <div className="adm" style={{ marginTop: 14 }}><div className="grade">
      {cards.map(([t, n]) => <div key={t}><div className="num">{n}</div><div>{t}</div></div>)}
    </div></div>
    <div className="card"><p>Cadastro de eventos, estabelecimentos, Hosts, cupons e demais módulos do ADM chegam na próxima entrega. Por enquanto, cadastre pelo <b>Table Editor</b> do Supabase.</p></div>
  </main></>);
}
