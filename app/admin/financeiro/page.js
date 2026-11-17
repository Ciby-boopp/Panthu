import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { abaDe } from '@/components/admin/AdmAbas';
import NovoLancamento from '@/components/admin/v3/NovoLancamento';
import { brl, dataBR, dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro' };
const ehReceita = (t) => ['receita', 'entrada'].includes(String(t).toLowerCase());
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['lancamentos', 'resumo', 'auditoria'], 'lancamentos');
  const filtro = ['receita', 'despesa'].includes(sp?.tipo) ? sp.tipo : '';
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'lancamentos') {
    let q = sb.from('financeiro').select('*').order('data', { ascending: false }).limit(100);
    if (filtro) q = q.eq('tipo', filtro);
    const { data } = await q;
    conteudo = (<>
      <NovoLancamento />
      <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>{[['', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([v, t]) => <Link key={v} className={`btn mini ${filtro === v ? 'p' : 'o'}`} href={`/admin/financeiro?aba=lancamentos${v ? `&tipo=${v}` : ''}`}>{t}</Link>)}</div>
      <section className="card">
        {(data || []).length === 0 ? <p className="vazio">Nenhum lançamento.</p> : data.map((l) => (
          <div className="item" key={l.id}><span><b>{l.descricao || l.categoria || (ehReceita(l.tipo) ? 'Receita' : 'Despesa')}</b><small>{dataBR(l.data)}{l.categoria ? ` · ${l.categoria}` : ''}{l.status && l.status !== 'pago' ? ` · ${l.status}` : ''}</small></span>
            <b className={ehReceita(l.tipo) ? 'up' : 'down'}>{ehReceita(l.tipo) ? '+' : '−'} {brl(l.valor)}</b></div>
        ))}
        <small style={{ color: 'var(--suave)' }}>Lançamentos não podem ser apagados por aqui: a exclusão exige motivo e fica registrada na auditoria.</small>
      </section></>);
  } else if (aba === 'resumo') {
    const { data } = await sb.from('financeiro').select('tipo, valor, data, status, categoria').neq('status', 'cancelado').limit(5000);
    const mes = {}; const cat = {};
    (data || []).forEach((l) => {
      const k = String(l.data).slice(0, 7); const m = (mes[k] ||= { r: 0, d: 0 });
      if (ehReceita(l.tipo)) m.r += Number(l.valor); else m.d += Number(l.valor);
      const c = l.categoria || 'Sem categoria'; cat[c] = (cat[c] || 0) + (ehReceita(l.tipo) ? Number(l.valor) : -Number(l.valor));
    });
    const meses = Object.keys(mes).sort().reverse().slice(0, 12);
    const tr = meses.reduce((a, k) => a + mes[k].r, 0), td = meses.reduce((a, k) => a + mes[k].d, 0);
    conteudo = (<>
      <div className="stats"><div className="stat"><div className="num up">{brl(tr)}</div><span>Receitas (12 meses)</span></div><div className="stat"><div className="num down">{brl(td)}</div><span>Despesas (12 meses)</span></div><div className="stat"><div className="num">{brl(tr - td)}</div><span>Saldo</span></div></div>
      <section className="card"><h3>Por mês</h3>{meses.length === 0 ? <p className="vazio">Sem dados.</p> : meses.map((k) => <div className="item" key={k}><b>{k.slice(5)}/{k.slice(0, 4)}</b><span><span className="up">{brl(mes[k].r)}</span> · <span className="down">{brl(mes[k].d)}</span> · <b>{brl(mes[k].r - mes[k].d)}</b></span></div>)}</section>
      <section className="card"><h3>Por categoria (saldo)</h3>{Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([c, v]) => <div className="item" key={c}><span>{c}</span><b className={v >= 0 ? 'up' : 'down'}>{brl(v)}</b></div>)}</section></>);
  } else {
    const { data } = await sb.from('auditoria').select('id, acao, autor_id, detalhes, criado_em').ilike('acao', 'financeiro%').order('criado_em', { ascending: false }).limit(60);
    const ids = [...new Set((data || []).map((a) => a.autor_id).filter(Boolean))];
    const { data: autores } = ids.length ? await sb.from('perfis').select('id, nome').in('id', ids) : { data: [] };
    const nomeDe = Object.fromEntries((autores || []).map((p) => [p.id, p.nome]));
    conteudo = (<section className="card"><h3>Auditoria do financeiro</h3>
      {(data || []).length === 0 ? <p className="vazio">Nenhum registro ainda.</p> : data.map((a) => (
        <div className="item" key={a.id}><span><b>{a.acao.replace('financeiro_', '').replace('insert', 'criado').replace('update', 'alterado').replace('delete', 'excluído')}</b><small>por {nomeDe[a.autor_id] || 'sistema'}{a.detalhes?.motivo ? ` · motivo: ${a.detalhes.motivo}` : ''}</small></span><small>{dataHora(a.criado_em)}</small></div>
      ))}
      <p style={{ marginBottom: 0 }}><Link href="/admin/auditoria">Ver auditoria completa</Link></p></section>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Financeiro</h1>
    <AdmAbas base="/admin/financeiro" itens={[['lancamentos', 'Receitas e despesas'], ['resumo', 'Resumo'], ['auditoria', 'Auditoria']]} ativo={aba} />
    {conteudo}
  </>);
}
