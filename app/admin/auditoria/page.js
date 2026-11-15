import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
const POR_PAGINA = 50;
const OCULTAR = ['atualizado_em', 'criado_em'];

// Mostra só o que mudou entre "antes" e "depois".
function mudancas(d) {
  if (!d || typeof d !== 'object' || !('antes' in d || 'depois' in d)) return null;
  const a = d.antes || {}, b = d.depois || {};
  const chaves = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !OCULTAR.includes(k));
  const lista = chaves.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return { lista, a, b, completo: !d.antes || !d.depois };
}
const mostrar = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default async function Auditoria({ searchParams }) {
  const sp = await searchParams;
  const pag = Math.max(0, parseInt(sp?.p, 10) || 0);
  const acao = String(sp?.acao || '').replace(/[^a-z0-9_]/gi, '');
  const sb = await criarServidor();
  let q = sb.from('auditoria').select('id, autor_id, acao, alvo_id, resultado, detalhes, criado_em')
    .order('criado_em', { ascending: false }).range(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA);
  if (acao) q = q.ilike('acao', `${acao}%`);
  const { data, error } = await q;
  const linhas = (data || []).slice(0, POR_PAGINA);
  const temMais = (data || []).length > POR_PAGINA;
  const ids = [...new Set(linhas.flatMap(l => [l.autor_id, l.alvo_id]).filter(Boolean))];
  const { data: nomes } = ids.length ? await sb.from('perfis').select('id, nome').in('id', ids) : { data: [] };
  const nome = Object.fromEntries((nomes || []).map(n => [n.id, n.nome]));
  const href = (p) => `/admin/auditoria?p=${p}${acao ? `&acao=${acao}` : ''}`;

  return (<>
    <h1 style={{ fontSize: 30 }}>Auditoria</h1>
    <p className="vazio-nota">Histórico das ações administrativas. Os registros não podem ser editados nem apagados por usuários.</p>
    <form className="card" action="/admin/auditoria">
      <div className="campo"><label htmlFor="acao">Filtrar por tipo de ação (começa com…)</label>
        <input id="acao" name="acao" defaultValue={acao} placeholder="ex.: perfis, financeiro, host" /></div>
      <button className="btn p mini">Filtrar</button>
    </form>
    {error && <div className="card"><p>Não foi possível carregar. Rode <b>supabase/adm-fase1.sql</b> no Supabase.</p><small style={{ color: 'var(--suave)' }}>{error.message}</small></div>}
    {!error && !linhas.length && <div className="card vazio"><h3>Nenhum registro encontrado</h3></div>}
    {linhas.map(l => {
      const m = mudancas(l.detalhes);
      return (<div className="card" key={l.id}>
        <div className="linha"><b>{l.acao}</b><span className="tag">{quando(l.criado_em)}</span></div>
        <p style={{ margin: '4px 0' }}>Por <b>{l.autor_id ? (nome[l.autor_id] || 'conta removida') : 'sistema / banco de dados'}</b>
          {l.alvo_id && <> · afetou <b>{nome[l.alvo_id] || l.alvo_id.slice(0, 8)}</b></>}
          {l.resultado && l.resultado !== 'sucesso' && <span className="tag erro" style={{ marginLeft: 8 }}>{l.resultado}</span>}</p>
        {l.detalhes?.motivo && <p><b>Motivo:</b> {l.detalhes.motivo}</p>}
        <details><summary style={{ cursor: 'pointer', color: 'var(--link)' }}>Ver detalhes</summary>
          {m ? (m.lista.length ? m.lista.map(k => (
            <div className="linha-rank" key={k}><span>{k}</span><span>{mostrar(m.a[k])} → <b>{mostrar(m.b[k])}</b></span></div>
          )) : <p className="vazio-nota">Sem diferenças nas colunas monitoradas.</p>)
            : <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--suave)' }}>{JSON.stringify(l.detalhes, null, 2)}</pre>}
        </details>
      </div>);
    })}
    <div className="linha" style={{ justifyContent: 'flex-start' }}>
      {pag > 0 && <Link className="btn o mini" href={href(pag - 1)}>← Mais recentes</Link>}
      {temMais && <Link className="btn o mini" href={href(pag + 1)}>Mais antigos →</Link>}
    </div>
  </>);
}
