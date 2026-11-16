import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import NovaRegiao from '@/components/admin/v3/NovaRegiao';
import AlternarAtivo from '@/components/admin/v3/AlternarAtivo';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cidades e regiões' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['regioes', 'expansao'], 'regioes');
  const sb = await criarServidor();
  const [{ data: regioes }, { count: totalUsuarios }, { data: cidades, error }] = await Promise.all([
    sb.from('regioes').select('*').order('nome'),
    sb.from('perfis').select('*', { count: 'exact', head: true }),
    sb.rpc('adm_cidades'),
  ]);
  const lista = cidades || [];
  const semRegiao = lista.filter((c) => !c.tem_regiao);
  return (<>
    <h1 style={{ fontSize: 30 }}>Cidades e regiões</h1>
    <AdmAbas base="/admin/regioes" itens={[['regioes', 'Cidades e regiões'], ['expansao', 'Expansão e relatórios']]} ativo={aba} />
    {aba === 'regioes' ? (<>
      <NovaRegiao />
      <section className="card">
        {(regioes || []).length === 0 ? <p className="vazio">Nenhuma região cadastrada.</p> : regioes.map((r) => (
          <div className="item" key={r.id} style={{ alignItems: 'center' }}><span><b>{r.nome}</b></span>{'ativa' in r && <AlternarAtivo tabela="regioes" id={r.id} coluna="ativa" inicial={r.ativa !== false} rotulos={['Ativa', 'Inativa']} />}</div>
        ))}
      </section>
    </>) : (<>
      <Aviso erro={error} />
      <div className="stats">
        <div className="stat"><div className="num">{totalUsuarios || 0}</div><span>Usuários no total</span></div>
        <div className="stat"><div className="num">{lista.length}</div><span>Cidades informadas</span></div>
        <div className="stat"><div className="num">{semRegiao.length}</div><span>Cidades sem região (oportunidades)</span></div>
      </div>
      <section className="card"><h3>Cidades por número de usuários</h3>
        {lista.length === 0 ? <p className="vazio">Ainda ninguém informou a cidade nas boas-vindas.</p> : lista.map((c) => (
          <div className="item" key={c.cidade}><span><b>{c.cidade}</b><small>{c.novos_30d} novo(s) nos últimos 30 dias</small></span>
            <span><span className="tag">{c.usuarios} usuário(s)</span>{c.tem_regiao ? <span className="tag ok">com região</span> : <span className="tag erro">sem região</span>}</span></div>
        ))}
      </section>
    </>)}
  </>);
}
