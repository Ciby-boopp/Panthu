import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import ResolverErro from '@/components/admin/v3/ResolverErro';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Monitoramento técnico' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['erros', 'estabilidade', 'alertas'], 'erros');
  const sb = await criarServidor();
  const desde = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: erros, error } = await sb.from('adm_erros').select('id, mensagem, rota, origem, resolvido, criado_em').gte('criado_em', desde).order('criado_em', { ascending: false }).limit(500);
  const lista = erros || [];
  const abertos = lista.filter((e) => !e.resolvido);
  let conteudo;
  if (aba === 'erros') {
    const grupos = {};
    abertos.forEach((e) => { const k = e.mensagem; (grupos[k] ||= { msg: k, rota: e.rota, ids: [], ultimo: e.criado_em }).ids.push(e.id); });
    const gs = Object.values(grupos).sort((a, b) => b.ids.length - a.ids.length);
    conteudo = (<section className="card"><h3>Erros abertos (14 dias)</h3>
      {gs.length === 0 ? <p className="vazio">Nenhum erro aberto. 🎉</p> : gs.map((g) => (
        <div className="item" key={g.msg} style={{ alignItems: 'center' }}><span><b>{g.msg}</b><small>{g.rota} · último {dataHora(g.ultimo)}</small></span><span><span className="tag erro">{g.ids.length}×</span><ResolverErro ids={g.ids} rotulo="Resolver" /></span></div>
      ))}
    </section>);
  } else if (aba === 'estabilidade') {
    const dias = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
    const porDia = Object.fromEntries(dias.map((d) => [d, 0]));
    lista.forEach((e) => { const d = new Date(e.criado_em).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); if (d in porDia) porDia[d]++; });
    const max = Math.max(1, ...Object.values(porDia));
    const { count: sess } = await sb.from('sessoes').select('*', { count: 'exact', head: true }).gte('ultima_atividade', new Date(Date.now() - 86400000).toISOString());
    const taxa = sess ? ((lista.length / Math.max(1, sess)) * 100).toFixed(1) : '—';
    conteudo = (<>
      <div className="stats"><div className="stat"><div className="num">{lista.length}</div><span>Erros em 14 dias</span></div><div className="stat"><div className="num">{sess || 0}</div><span>Sessões nas últimas 24 h</span></div><div className="stat"><div className="num">{taxa}{taxa === '—' ? '' : '%'}</div><span>Erros por sessão</span></div></div>
      <section className="card"><h3>Erros por dia</h3><div className="barras fino">{dias.map((d) => <div className="barra" key={d}><b>{porDia[d] || ''}</b><i style={{ height: `${(porDia[d] / max) * 100}%` }} /><span>{d.slice(8)}</span></div>)}</div></section>
      <p style={{ color: 'var(--suave)' }}>Quedas do site e tempo de resposta aparecem no painel da Vercel (Analytics) e do Supabase (Reports).</p></>);
  } else {
    const hoje = new Date(Date.now() - 86400000).toISOString();
    const [{ count: den }, { count: tk }, { count: pend }, { count: semAceite }] = await Promise.all([
      sb.from('denuncias').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
      sb.from('suporte_tickets').select('*', { count: 'exact', head: true }).eq('status', 'aberto'),
      sb.from('financeiro').select('*', { count: 'exact', head: true }).eq('status', 'pendente').lt('vencimento', new Date().toISOString().slice(0, 10)),
      sb.from('perfis').select('*', { count: 'exact', head: true }).is('privacidade_aceita_em', null),
    ]);
    const err24 = lista.filter((e) => e.criado_em >= hoje && !e.resolvido).length;
    const alertas = [
      [err24 >= 10, 'erro', `${err24} erros abertos nas últimas 24 h`, '/admin/monitoramento?aba=erros'],
      [(den || 0) > 0, 'aviso', `${den} denúncia(s) aberta(s) esperando análise`, '/admin/denuncias'],
      [(tk || 0) > 0, 'aviso', `${tk} chamado(s) de suporte sem resposta`, '/admin/suporte'],
      [(pend || 0) > 0, 'erro', `${pend} lançamento(s) financeiro(s) pendente(s) e vencido(s)`, '/admin/financeiro'],
      [(semAceite || 0) > 0, 'aviso', `${semAceite} conta(s) sem aceite da política de privacidade`, '/admin/seguranca?aba=lgpd'],
    ].filter((a) => a[0]);
    conteudo = (<section className="card"><h3>Alertas</h3>
      {alertas.length === 0 ? <p className="vazio">Tudo em ordem. Nenhum alerta agora.</p> : alertas.map(([, tipo, txt, href]) => <div className="item" key={txt}><span><span className={`tag ${tipo === 'erro' ? 'erro' : ''}`}>{tipo === 'erro' ? 'Urgente' : 'Atenção'}</span>{txt}</span><Link href={href}>Ver</Link></div>)}</section>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Monitoramento técnico</h1>
    <AdmAbas base="/admin/monitoramento" itens={[['erros', 'Erros'], ['estabilidade', 'Estabilidade'], ['alertas', 'Alertas']]} ativo={aba} />
    <Aviso erro={error} />
    {conteudo}
  </>);
}
